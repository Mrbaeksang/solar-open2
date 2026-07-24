package main

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"strings"
	"time"

	"github.com/Mrbaeksang/solar-open2/apps/api/internal/content"
	"github.com/Mrbaeksang/solar-open2/apps/api/internal/database"
	"github.com/Mrbaeksang/solar-open2/apps/api/internal/provider"
	"github.com/Mrbaeksang/solar-open2/apps/api/internal/retrieval"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()
	if err := run(ctx, logger); err != nil {
		logger.Error("indexing failed", "category", "indexer", "error", err)
		os.Exit(1)
	}
}

func run(ctx context.Context, logger *slog.Logger) error {
	corpus, err := content.Load()
	if err != nil {
		return fmt.Errorf("load reviewed corpus: %w", err)
	}
	databaseURL := strings.TrimSpace(os.Getenv("DATABASE_URL"))
	store, err := database.Open(ctx, databaseURL)
	if err != nil {
		return err
	}
	defer store.Close()
	if err := store.Migrate(ctx); err != nil {
		return err
	}

	var embedder retrieval.Embedder
	if strings.EqualFold(os.Getenv("PROVIDER_MODE"), "deterministic") {
		embedder = provider.Deterministic{}
	} else {
		apiKey := strings.TrimSpace(os.Getenv("UPSTAGE_API_KEY"))
		if apiKey == "" {
			apiKey = strings.TrimSpace(os.Getenv("solar"))
		}
		upstage, err := provider.NewUpstage(provider.UpstageConfig{
			APIKey:  apiKey,
			BaseURL: os.Getenv("UPSTAGE_BASE_URL"),
		})
		if err != nil {
			return err
		}
		embedder = upstage
	}
	if err := store.ReplaceCorpus(ctx, corpus.Sources, corpus.Passages, embedder); err != nil {
		return err
	}
	logger.Info("reviewed corpus indexed", "passages", len(corpus.Passages), "sources", len(corpus.Sources))
	return nil
}
