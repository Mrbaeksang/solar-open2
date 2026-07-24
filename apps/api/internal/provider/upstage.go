package provider

import (
	"bufio"
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math"
	"net/http"
	"strings"
	"time"
	"unicode"

	"github.com/Mrbaeksang/solar-open2/apps/api/internal/domain"
)

const (
	DefaultBaseURL        = "https://api.upstage.ai/v1"
	DefaultChatModel      = "solar-open2"
	QueryEmbeddingModel   = "solar-embedding-2-query"
	PassageEmbeddingModel = "solar-embedding-2-passage"
	EmbeddingDimension    = 1024
)

// ChatRequest is the provider-neutral prompt sent from the agent.
type ChatRequest struct {
	SystemPrompt string
	UserPrompt   string
}

// ChatModel is the streaming model boundary used by the Eino-backed runner.
type ChatModel interface {
	Stream(context.Context, ChatRequest) (domain.TextStream, error)
}

// UpstageConfig contains no browser-visible values.
type UpstageConfig struct {
	APIKey       string
	BaseURL      string
	ChatModel    string
	ChatProtocol string
	Client       *http.Client
}

// Upstage implements both Solar Open 2 chat and Solar Embedding 2.
type Upstage struct {
	apiKey       string
	baseURL      string
	chatModel    string
	chatProtocol string
	client       *http.Client
}

// NewUpstage validates server-side provider configuration.
func NewUpstage(config UpstageConfig) (*Upstage, error) {
	if strings.TrimSpace(config.APIKey) == "" {
		return nil, errors.New("UPSTAGE_API_KEY is required")
	}
	baseURL := strings.TrimRight(strings.TrimSpace(config.BaseURL), "/")
	if baseURL == "" {
		baseURL = DefaultBaseURL
	}
	chatModel := strings.TrimSpace(config.ChatModel)
	if chatModel == "" {
		chatModel = DefaultChatModel
	}
	chatProtocol := strings.ToLower(strings.TrimSpace(config.ChatProtocol))
	if chatProtocol == "" {
		chatProtocol = "openai"
	}
	if chatProtocol != "auto" && chatProtocol != "openai" && chatProtocol != "anthropic" {
		return nil, errors.New("UPSTAGE_CHAT_PROTOCOL must be auto, openai, or anthropic")
	}
	client := config.Client
	if client == nil {
		client = &http.Client{Timeout: 90 * time.Second}
	}
	return &Upstage{
		apiKey:       config.APIKey,
		baseURL:      baseURL,
		chatModel:    chatModel,
		chatProtocol: chatProtocol,
		client:       client,
	}, nil
}

// Dimension returns the fixed Solar Embedding 2 vector size.
func (u *Upstage) Dimension() int {
	return EmbeddingDimension
}

// EmbedQuery uses the asymmetric query encoder.
func (u *Upstage) EmbedQuery(ctx context.Context, text string) ([]float32, error) {
	vectors, err := u.embed(ctx, QueryEmbeddingModel, []string{text})
	if err != nil {
		return nil, err
	}
	if len(vectors) != 1 {
		return nil, errors.New("embedding provider returned no query vector")
	}
	return vectors[0], nil
}

// EmbedPassages uses the asymmetric passage encoder.
func (u *Upstage) EmbedPassages(ctx context.Context, texts []string) ([][]float32, error) {
	if len(texts) == 0 {
		return nil, nil
	}
	const batchSize = 64
	result := make([][]float32, 0, len(texts))
	for start := 0; start < len(texts); start += batchSize {
		end := min(start+batchSize, len(texts))
		batch, err := u.embed(ctx, PassageEmbeddingModel, texts[start:end])
		if err != nil {
			return nil, err
		}
		result = append(result, batch...)
	}
	return result, nil
}

func (u *Upstage) embed(ctx context.Context, model string, texts []string) ([][]float32, error) {
	requestBody, err := json.Marshal(map[string]any{
		"model": model,
		"input": texts,
	})
	if err != nil {
		return nil, fmt.Errorf("encode embedding request: %w", err)
	}
	request, err := http.NewRequestWithContext(
		ctx,
		http.MethodPost,
		u.baseURL+"/embeddings",
		bytes.NewReader(requestBody),
	)
	if err != nil {
		return nil, fmt.Errorf("create embedding request: %w", err)
	}
	u.authorize(request)

	response, err := u.client.Do(request)
	if err != nil {
		return nil, fmt.Errorf("embedding request failed: %w", err)
	}
	defer response.Body.Close()
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return nil, safeProviderError("embedding", response)
	}

	var payload struct {
		Data []struct {
			Index     int       `json:"index"`
			Embedding []float32 `json:"embedding"`
		} `json:"data"`
	}
	decoder := json.NewDecoder(io.LimitReader(response.Body, 16<<20))
	if err := decoder.Decode(&payload); err != nil {
		return nil, fmt.Errorf("decode embedding response: %w", err)
	}
	if len(payload.Data) != len(texts) {
		return nil, fmt.Errorf("embedding count mismatch: got %d, want %d", len(payload.Data), len(texts))
	}
	vectors := make([][]float32, len(texts))
	for _, item := range payload.Data {
		if item.Index < 0 || item.Index >= len(vectors) {
			return nil, errors.New("embedding response contains an invalid index")
		}
		if len(item.Embedding) != EmbeddingDimension {
			return nil, fmt.Errorf("embedding dimension = %d, want %d", len(item.Embedding), EmbeddingDimension)
		}
		vectors[item.Index] = item.Embedding
	}
	return vectors, nil
}

// Stream starts either the Solar Open 2 Anthropic-compatible stream or the
// legacy OpenAI-compatible Solar API stream.
func (u *Upstage) Stream(ctx context.Context, input ChatRequest) (domain.TextStream, error) {
	endpoint := u.baseURL + "/chat/completions"
	payload := map[string]any{
		"model": u.chatModel,
		"messages": []map[string]string{
			{"role": "system", "content": input.SystemPrompt},
			{"role": "user", "content": input.UserPrompt},
		},
		"stream":      true,
		"temperature": 0.2,
	}
	anthropicProtocol := u.chatProtocol == "anthropic" ||
		(u.chatProtocol == "auto" && strings.HasPrefix(u.chatModel, "solar-open2"))
	if !anthropicProtocol && strings.HasPrefix(u.chatModel, "solar-open2") {
		payload["max_tokens"] = 1_200
		payload["temperature"] = 1.0
		payload["top_p"] = 1.0
		payload["reasoning_effort"] = "none"
	}
	if anthropicProtocol {
		endpoint = u.baseURL + "/messages"
		payload = map[string]any{
			"model":  u.chatModel,
			"system": input.SystemPrompt,
			"messages": []map[string]string{
				{"role": "user", "content": input.UserPrompt},
			},
			"max_tokens":       1_200,
			"stream":           true,
			"temperature":      1.0,
			"top_p":            1.0,
			"reasoning_effort": "none",
		}
	}
	requestBody, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("encode chat request: %w", err)
	}
	request, err := http.NewRequestWithContext(
		ctx,
		http.MethodPost,
		endpoint,
		bytes.NewReader(requestBody),
	)
	if err != nil {
		return nil, fmt.Errorf("create chat request: %w", err)
	}
	u.authorize(request)
	request.Header.Set("Accept", "text/event-stream")
	if anthropicProtocol {
		request.Header.Set("Anthropic-Version", "2023-06-01")
	}

	response, err := u.client.Do(request)
	if err != nil {
		return nil, fmt.Errorf("chat request failed: %w", err)
	}
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		defer response.Body.Close()
		return nil, safeProviderError("chat", response)
	}
	scanner := bufio.NewScanner(response.Body)
	scanner.Buffer(make([]byte, 8<<10), 1<<20)
	return &upstageTextStream{body: response.Body, scanner: scanner}, nil
}

func (u *Upstage) authorize(request *http.Request) {
	request.Header.Set("Authorization", "Bearer "+u.apiKey)
	request.Header.Set("Content-Type", "application/json")
}

type upstageTextStream struct {
	body        io.ReadCloser
	scanner     *bufio.Scanner
	done        bool
	emittedText bool
	stopReason  string
}

func (s *upstageTextStream) Recv() (string, error) {
	if s.done {
		return "", io.EOF
	}
	for s.scanner.Scan() {
		line := strings.TrimSpace(s.scanner.Text())
		if !strings.HasPrefix(line, "data:") {
			continue
		}
		data := strings.TrimSpace(strings.TrimPrefix(line, "data:"))
		if data == "[DONE]" {
			s.done = true
			return "", io.EOF
		}
		var event struct {
			Type  string `json:"type"`
			Delta struct {
				Type       string `json:"type"`
				Text       string `json:"text"`
				StopReason string `json:"stop_reason"`
			} `json:"delta"`
			Choices []struct {
				Delta struct {
					Content string `json:"content"`
				} `json:"delta"`
			} `json:"choices"`
		}
		if err := json.Unmarshal([]byte(data), &event); err != nil {
			return "", fmt.Errorf("decode chat event: %w", err)
		}
		if len(event.Choices) > 0 && event.Choices[0].Delta.Content != "" {
			return event.Choices[0].Delta.Content, nil
		}
		if event.Type == "content_block_delta" &&
			event.Delta.Type == "text_delta" &&
			event.Delta.Text != "" {
			s.emittedText = true
			return event.Delta.Text, nil
		}
		if event.Type == "message_delta" && event.Delta.StopReason != "" {
			s.stopReason = event.Delta.StopReason
		}
		if event.Type == "message_stop" {
			s.done = true
			if !s.emittedText {
				if s.stopReason == "" {
					s.stopReason = "unknown"
				}
				return "", fmt.Errorf("chat stream ended without answer text: %s", s.stopReason)
			}
			return "", io.EOF
		}
	}
	s.done = true
	if err := s.scanner.Err(); err != nil {
		return "", fmt.Errorf("read chat stream: %w", err)
	}
	return "", io.EOF
}

func (s *upstageTextStream) Close() error {
	s.done = true
	return s.body.Close()
}

func safeProviderError(operation string, response *http.Response) error {
	var payload struct {
		Error struct {
			Message string `json:"message"`
			Type    string `json:"type"`
		} `json:"error"`
	}
	_ = json.NewDecoder(io.LimitReader(response.Body, 32<<10)).Decode(&payload)
	message := domain.CompactText(payload.Error.Message)
	if len(message) > 240 {
		message = string([]rune(message)[:240])
	}
	if message == "" {
		message = http.StatusText(response.StatusCode)
	}
	return fmt.Errorf("%s provider returned %d: %s", operation, response.StatusCode, message)
}

// Deterministic is an offline model and embedder for tests and local previews.
type Deterministic struct{}

func (Deterministic) Dimension() int {
	return EmbeddingDimension
}

func (Deterministic) EmbedQuery(_ context.Context, text string) ([]float32, error) {
	return deterministicVector(text), nil
}

func (Deterministic) EmbedPassages(_ context.Context, texts []string) ([][]float32, error) {
	result := make([][]float32, len(texts))
	for index, text := range texts {
		result[index] = deterministicVector(text)
	}
	return result, nil
}

func (Deterministic) Stream(_ context.Context, request ChatRequest) (domain.TextStream, error) {
	answer := "교재 근거를 바탕으로 보면, AI는 입력을 받아 목표에 맞는 결과를 만드는 기계 기반 시스템입니다. 실제로는 데이터에서 찾은 규칙을 사용하며, 사람처럼 이해한다고 단정하면 안 됩니다. [1]"
	if strings.Contains(request.SystemPrompt, "고등학생 이상") {
		answer = "주장: AI는 명시적 또는 암묵적 목표에 따라 입력으로부터 예측·추천·결정을 산출하는 기계 기반 시스템입니다. 메커니즘은 데이터와 모델을 이용한 규칙 추정입니다. 다만 출력의 유창함은 이해나 진실성을 보장하지 않습니다. [1]"
	}
	return domain.NewSliceTextStream(answer, 18), nil
}

func deterministicVector(text string) []float32 {
	vector := make([]float32, EmbeddingDimension)
	fields := strings.FieldsFunc(strings.ToLower(text), func(r rune) bool {
		return unicode.IsSpace(r) || unicode.IsPunct(r) || unicode.IsSymbol(r)
	})
	for _, field := range fields {
		sum := sha256.Sum256([]byte(field))
		index := int(sum[0])<<2 | int(sum[1]&3)
		sign := float32(1)
		if sum[2]&1 == 1 {
			sign = -1
		}
		vector[index] += sign
	}
	var magnitude float64
	for _, value := range vector {
		magnitude += float64(value * value)
	}
	if magnitude == 0 {
		vector[0] = 1
		return vector
	}
	scale := float32(1 / math.Sqrt(magnitude))
	for index := range vector {
		vector[index] *= scale
	}
	return vector
}
