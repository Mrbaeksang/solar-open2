package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/Mrbaeksang/solar-open2/apps/api/internal/agent"
	"github.com/Mrbaeksang/solar-open2/apps/api/internal/content"
	"github.com/Mrbaeksang/solar-open2/apps/api/internal/database"
	"github.com/Mrbaeksang/solar-open2/apps/api/internal/observability"
	"github.com/Mrbaeksang/solar-open2/apps/api/internal/provider"
	"github.com/Mrbaeksang/solar-open2/apps/api/internal/retrieval"
	"github.com/Mrbaeksang/solar-open2/apps/api/internal/transport/agui"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	if err := run(logger); err != nil {
		logger.Error("server stopped", "category", "startup_or_runtime", "error", err)
		os.Exit(1)
	}
}

func run(logger *slog.Logger) error {
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	corpus, err := content.Load()
	if err != nil {
		return fmt.Errorf("load reviewed corpus: %w", err)
	}
	store, embedder, model, retrievalMode, closeStore, err := dependencies(ctx, corpus, logger)
	if err != nil {
		return err
	}
	defer closeStore()

	runner, err := agent.NewRunner(ctx, store, embedder, model, corpus.Sources)
	if err != nil {
		return fmt.Errorf("build agent: %w", err)
	}
	metrics := observability.NewMetrics()
	mux := http.NewServeMux()
	mux.Handle("/v1/agent", agui.NewHandler(runner, agui.Options{
		AllowedOrigins:    allowedOrigins(),
		Recorder:          metrics,
		RequestsPerMinute: 20,
		MaxConcurrentRuns: 8,
	}))
	mux.Handle("/metrics", metrics)
	mux.HandleFunc("/healthz", func(response http.ResponseWriter, request *http.Request) {
		if request.Method != http.MethodGet {
			response.Header().Set("Allow", "GET")
			http.Error(response, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		response.Header().Set("Content-Type", "application/json")
		response.Header().Set("Cache-Control", "no-store")
		_, _ = fmt.Fprintf(
			response,
			`{"status":"ok","retrieval":"%s"}`,
			retrievalMode,
		)
	})

	port := strings.TrimSpace(os.Getenv("PORT"))
	if port == "" {
		port = "8080"
	}
	server := &http.Server{
		Addr:              ":" + port,
		Handler:           securityHeaders(mux),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		IdleTimeout:       90 * time.Second,
		MaxHeaderBytes:    32 << 10,
	}
	serverErrors := make(chan error, 1)
	go func() {
		logger.Info(
			"api listening",
			"port",
			port,
			"providerMode",
			providerMode(),
			"retrieval",
			retrievalMode,
			"rawChatPersistence",
			false,
		)
		serverErrors <- server.ListenAndServe()
	}()

	select {
	case <-ctx.Done():
		shutdownContext, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		return server.Shutdown(shutdownContext)
	case err := <-serverErrors:
		if errors.Is(err, http.ErrServerClosed) {
			return nil
		}
		return err
	}
}

func dependencies(
	ctx context.Context,
	corpus content.Corpus,
	logger *slog.Logger,
) (
	retrieval.Store,
	retrieval.Embedder,
	provider.ChatModel,
	string,
	func(),
	error,
) {
	var embedder retrieval.Embedder
	var model provider.ChatModel
	switch providerMode() {
	case "deterministic":
		deterministic := provider.Deterministic{}
		embedder = deterministic
		model = deterministic
	case "upstage":
		apiKey := strings.TrimSpace(os.Getenv("UPSTAGE_API_KEY"))
		if apiKey == "" {
			apiKey = strings.TrimSpace(os.Getenv("solar"))
		}
		upstage, err := provider.NewUpstage(provider.UpstageConfig{
			APIKey:       apiKey,
			BaseURL:      os.Getenv("UPSTAGE_BASE_URL"),
			ChatModel:    os.Getenv("UPSTAGE_CHAT_MODEL"),
			ChatProtocol: os.Getenv("UPSTAGE_CHAT_PROTOCOL"),
		})
		if err != nil {
			return nil, nil, nil, "", func() {}, err
		}
		embedder = upstage
		model = upstage
	default:
		return nil, nil, nil, "", func() {}, errors.New("PROVIDER_MODE must be upstage or deterministic")
	}

	var store retrieval.Store = retrieval.NewMemoryStore(corpus.Passages)
	closeStore := func() {}
	databaseURL := strings.TrimSpace(os.Getenv("DATABASE_URL"))
	if databaseURL == "" {
		if strings.EqualFold(os.Getenv("AUTO_INDEX"), "true") {
			return nil, nil, nil, "", closeStore, errors.New(
				"AUTO_INDEX=true requires DATABASE_URL; semantic retrieval cannot start without a pgvector-enabled PostgreSQL service",
			)
		}
		logger.Warn("using in-memory lexical retrieval", "persistence", false)
		return store, embedder, model, "memory-lexical", closeStore, nil
	}
	postgres, err := database.Open(ctx, databaseURL)
	if err != nil {
		return nil, nil, nil, "", closeStore, err
	}
	closeStore = postgres.Close
	if err := postgres.Migrate(ctx); err != nil {
		closeStore()
		return nil, nil, nil, "", func() {}, err
	}
	vectorVersion, err := postgres.VectorVersion(ctx)
	if err != nil {
		closeStore()
		return nil, nil, nil, "", func() {}, err
	}
	if strings.EqualFold(os.Getenv("AUTO_INDEX"), "true") {
		if err := postgres.ReplaceCorpus(ctx, corpus.Sources, corpus.Passages, embedder); err != nil {
			closeStore()
			return nil, nil, nil, "", func() {}, err
		}
		logger.Info("reviewed corpus indexed", "passages", len(corpus.Passages), "sources", len(corpus.Sources))
	}
	logger.Info("pgvector retrieval ready", "version", vectorVersion)
	store = postgres
	return store, embedder, model, "postgres-pgvector", closeStore, nil
}

func providerMode() string {
	mode := strings.ToLower(strings.TrimSpace(os.Getenv("PROVIDER_MODE")))
	if mode == "" {
		return "upstage"
	}
	return mode
}

func allowedOrigins() []string {
	origins := []string{"http://localhost:3000", "http://127.0.0.1:3000"}
	for _, origin := range strings.Split(os.Getenv("WEB_ORIGIN"), ",") {
		origin = strings.TrimRight(strings.TrimSpace(origin), "/")
		if origin != "" {
			origins = append(origins, origin)
		}
	}
	return origins
}

func securityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(response http.ResponseWriter, request *http.Request) {
		response.Header().Set("X-Content-Type-Options", "nosniff")
		response.Header().Set("Referrer-Policy", "no-referrer")
		response.Header().Set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
		next.ServeHTTP(response, request)
	})
}
