package agui

import (
	"bytes"
	"crypto/rand"
	"crypto/sha256"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"strings"
	"sync"
	"time"
	"unicode/utf8"

	"github.com/Mrbaeksang/solar-open2/apps/api/internal/domain"
	"github.com/google/uuid"
)

const maxRequestBytes = 64 << 10

// Options constrains browser origins. Wildcard origins are intentionally unsupported.
type Options struct {
	AllowedOrigins    []string
	Recorder          domain.MetricRecorder
	RequestsPerMinute int
	MaxConcurrentRuns int
}

// Handler adapts AG-UI RunAgentInput to the internal stateless runner.
type Handler struct {
	runner         domain.Runner
	allowedOrigins map[string]struct{}
	recorder       domain.MetricRecorder
	limiter        *ephemeralLimiter
	runSlots       chan struct{}
}

// NewHandler creates an AG-UI SSE endpoint.
func NewHandler(runner domain.Runner, options Options) *Handler {
	origins := make(map[string]struct{}, len(options.AllowedOrigins))
	for _, origin := range options.AllowedOrigins {
		origin = strings.TrimRight(strings.TrimSpace(origin), "/")
		if origin != "" && origin != "*" {
			origins[origin] = struct{}{}
		}
	}
	if options.RequestsPerMinute <= 0 {
		options.RequestsPerMinute = 60
	}
	if options.MaxConcurrentRuns <= 0 {
		options.MaxConcurrentRuns = 16
	}
	return &Handler{
		runner:         runner,
		allowedOrigins: origins,
		recorder:       options.Recorder,
		limiter:        newEphemeralLimiter(options.RequestsPerMinute),
		runSlots:       make(chan struct{}, options.MaxConcurrentRuns),
	}
}

func (h *Handler) ServeHTTP(response http.ResponseWriter, request *http.Request) {
	origin := strings.TrimRight(request.Header.Get("Origin"), "/")
	if origin != "" {
		if _, allowed := h.allowedOrigins[origin]; !allowed {
			http.Error(response, "origin is not allowed", http.StatusForbidden)
			return
		}
		response.Header().Set("Access-Control-Allow-Origin", origin)
		response.Header().Set("Vary", "Origin")
	}
	if request.Method == http.MethodOptions {
		response.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
		response.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		response.Header().Set("Access-Control-Max-Age", "600")
		response.WriteHeader(http.StatusNoContent)
		return
	}
	if request.Method != http.MethodPost {
		response.Header().Set("Allow", "POST, OPTIONS")
		http.Error(response, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	if h.runner == nil {
		http.Error(response, "agent is unavailable", http.StatusServiceUnavailable)
		return
	}
	if !h.limiter.Allow(clientAddress(request), time.Now()) {
		response.Header().Set("Retry-After", "60")
		http.Error(response, "too many requests", http.StatusTooManyRequests)
		return
	}
	select {
	case h.runSlots <- struct{}{}:
		defer func() { <-h.runSlots }()
	default:
		response.Header().Set("Retry-After", "2")
		http.Error(response, "agent is busy", http.StatusServiceUnavailable)
		return
	}

	input, err := decodeInput(request)
	if err != nil {
		http.Error(response, err.Error(), http.StatusBadRequest)
		return
	}
	startedAt := time.Now()
	metric := domain.RunMetric{
		Track:      input.Reading.Track,
		InputChars: utf8.RuneCountInString(input.Question),
	}
	defer func() {
		if h.recorder == nil {
			return
		}
		metric.LatencyMillis = time.Since(startedAt).Milliseconds()
		h.recorder.Record(metric)
	}()
	result, err := h.runner.Run(request.Context(), input)
	if err != nil {
		metric.ErrorCategory = "runner_error"
		http.Error(response, "agent run failed", http.StatusBadGateway)
		return
	}
	metric.Evidence = result.Evidence.Status
	metric.SourceCount = len(result.Evidence.SourceIDs)
	defer result.Stream.Close()

	response.Header().Set("Content-Type", "text/event-stream; charset=utf-8")
	response.Header().Set("Cache-Control", "no-cache, no-transform")
	response.Header().Set("Connection", "keep-alive")
	response.Header().Set("X-Accel-Buffering", "no")
	flusher, _ := response.(http.Flusher)
	messageID := uuid.NewString()

	if err := writeEvent(response, map[string]any{
		"type":     "RUN_STARTED",
		"threadId": input.ThreadID,
		"runId":    input.RunID,
	}); err != nil {
		return
	}
	if err := writeEvent(response, map[string]any{
		"type": "STATE_SNAPSHOT",
		"snapshot": map[string]any{
			"evidence": map[string]any{
				"status":      result.Evidence.Status,
				"sourceIds":   result.Evidence.SourceIDs,
				"sourceCount": len(result.Evidence.SourceIDs),
			},
		},
	}); err != nil {
		return
	}
	if err := writeEvent(response, map[string]any{
		"type": "CUSTOM",
		"name": "evidence",
		"value": map[string]any{
			"status":      result.Evidence.Status,
			"sourceIds":   result.Evidence.SourceIDs,
			"sourceCount": len(result.Evidence.SourceIDs),
		},
	}); err != nil {
		return
	}
	if err := writeEvent(response, map[string]any{
		"type":      "TEXT_MESSAGE_START",
		"messageId": messageID,
		"role":      "assistant",
	}); err != nil {
		return
	}
	if flusher != nil {
		flusher.Flush()
	}

	for {
		chunk, streamErr := result.Stream.Recv()
		if errors.Is(streamErr, io.EOF) {
			break
		}
		if streamErr != nil {
			metric.ErrorCategory = "stream_error"
			_ = writeEvent(response, map[string]any{
				"type":    "RUN_ERROR",
				"message": "answer stream interrupted",
			})
			if flusher != nil {
				flusher.Flush()
			}
			return
		}
		if chunk == "" {
			continue
		}
		metric.OutputChars += utf8.RuneCountInString(chunk)
		if err := writeEvent(response, map[string]any{
			"type":      "TEXT_MESSAGE_CONTENT",
			"messageId": messageID,
			"delta":     chunk,
		}); err != nil {
			return
		}
		if flusher != nil {
			flusher.Flush()
		}
	}
	if err := writeEvent(response, map[string]any{
		"type":      "TEXT_MESSAGE_END",
		"messageId": messageID,
	}); err != nil {
		return
	}
	_ = writeEvent(response, map[string]any{
		"type":     "RUN_FINISHED",
		"threadId": input.ThreadID,
		"runId":    input.RunID,
	})
	if flusher != nil {
		flusher.Flush()
	}
}

type runAgentInput struct {
	ThreadID string          `json:"threadId"`
	RunID    string          `json:"runId"`
	Messages []message       `json:"messages"`
	Context  []contextRecord `json:"context"`
}

type message struct {
	Role    string          `json:"role"`
	Content json.RawMessage `json:"content"`
}

type contextRecord struct {
	Description string          `json:"description"`
	Value       json.RawMessage `json:"value"`
}

func decodeInput(request *http.Request) (domain.AgentRequest, error) {
	reader := http.MaxBytesReader(nil, request.Body, maxRequestBytes)
	decoder := json.NewDecoder(reader)
	var input runAgentInput
	if err := decoder.Decode(&input); err != nil {
		return domain.AgentRequest{}, fmt.Errorf("invalid AG-UI request: %w", err)
	}
	if err := ensureJSONEnd(decoder); err != nil {
		return domain.AgentRequest{}, err
	}
	if input.ThreadID == "" {
		input.ThreadID = uuid.NewString()
	}
	if input.RunID == "" {
		input.RunID = uuid.NewString()
	}
	if len(input.ThreadID) > 128 || len(input.RunID) > 128 {
		return domain.AgentRequest{}, errors.New("run identifiers are too long")
	}

	question := ""
	messages := make([]domain.ChatMessage, 0, min(len(input.Messages), 12))
	start := max(0, len(input.Messages)-12)
	for _, item := range input.Messages[start:] {
		content, err := messageText(item.Content)
		if err != nil {
			return domain.AgentRequest{}, err
		}
		content = domain.CompactText(content)
		if content == "" {
			continue
		}
		if item.Role != "user" && item.Role != "assistant" {
			continue
		}
		messages = append(messages, domain.ChatMessage{Role: item.Role, Content: content})
		if item.Role == "user" {
			question = content
		}
	}
	if question == "" {
		return domain.AgentRequest{}, errors.New("a user question is required")
	}

	var reading domain.ReadingContext
	foundContext := false
	for _, item := range input.Context {
		if item.Description != "reading-context" {
			continue
		}
		if foundContext {
			return domain.AgentRequest{}, errors.New("reading context must appear once")
		}
		foundContext = true
		value := bytes.TrimSpace(item.Value)
		if len(value) == 0 {
			return domain.AgentRequest{}, errors.New("reading context is empty")
		}
		if value[0] == '"' {
			var encoded string
			if err := json.Unmarshal(value, &encoded); err != nil {
				return domain.AgentRequest{}, errors.New("reading context string is invalid")
			}
			value = []byte(encoded)
		}
		if err := json.Unmarshal(value, &reading); err != nil {
			return domain.AgentRequest{}, err
		}
	}
	if !foundContext {
		return domain.AgentRequest{}, errors.New("reading context is required")
	}

	return domain.AgentRequest{
		ThreadID:      input.ThreadID,
		RunID:         input.RunID,
		Question:      question,
		Messages:      messages,
		Reading:       reading,
		RequestOrigin: request.Header.Get("Origin"),
	}, nil
}

func messageText(raw json.RawMessage) (string, error) {
	var text string
	if err := json.Unmarshal(raw, &text); err == nil {
		return text, nil
	}
	var parts []struct {
		Type string `json:"type"`
		Text string `json:"text"`
	}
	if err := json.Unmarshal(raw, &parts); err != nil {
		return "", errors.New("message content must be text")
	}
	var builder strings.Builder
	for _, part := range parts {
		if part.Type == "text" || part.Type == "" {
			builder.WriteString(part.Text)
			builder.WriteByte(' ')
		}
	}
	return builder.String(), nil
}

func ensureJSONEnd(decoder *json.Decoder) error {
	var extra json.RawMessage
	if err := decoder.Decode(&extra); !errors.Is(err, io.EOF) {
		return errors.New("request must contain one JSON value")
	}
	return nil
}

func writeEvent(writer io.Writer, event any) error {
	payload, err := json.Marshal(event)
	if err != nil {
		return err
	}
	if _, err := writer.Write([]byte("data: ")); err != nil {
		return err
	}
	if _, err := writer.Write(payload); err != nil {
		return err
	}
	_, err = writer.Write([]byte("\n\n"))
	return err
}

type requestWindow struct {
	start time.Time
	count int
}

// ephemeralLimiter never retains a raw address and its hash salt changes on restart.
type ephemeralLimiter struct {
	mu       sync.Mutex
	salt     [32]byte
	limit    int
	requests map[[32]byte]requestWindow
}

func newEphemeralLimiter(limit int) *ephemeralLimiter {
	limiter := &ephemeralLimiter{
		limit:    limit,
		requests: make(map[[32]byte]requestWindow),
	}
	_, _ = rand.Read(limiter.salt[:])
	return limiter
}

func (l *ephemeralLimiter) Allow(address string, now time.Time) bool {
	hashInput := append(append([]byte(nil), l.salt[:]...), address...)
	key := sha256.Sum256(hashInput)
	l.mu.Lock()
	defer l.mu.Unlock()
	window := l.requests[key]
	if window.start.IsZero() || now.Sub(window.start) >= time.Minute {
		window = requestWindow{start: now}
	}
	if window.count >= l.limit {
		return false
	}
	window.count++
	l.requests[key] = window
	if len(l.requests) > 2_048 {
		for requestKey, candidate := range l.requests {
			if now.Sub(candidate.start) >= time.Minute {
				delete(l.requests, requestKey)
			}
		}
	}
	return true
}

func clientAddress(request *http.Request) string {
	if forwarded := strings.TrimSpace(request.Header.Get("X-Forwarded-For")); forwarded != "" {
		return strings.TrimSpace(strings.Split(forwarded, ",")[0])
	}
	host, _, err := net.SplitHostPort(request.RemoteAddr)
	if err == nil && host != "" {
		return host
	}
	return request.RemoteAddr
}
