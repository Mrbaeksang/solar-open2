package provider_test

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	"github.com/Mrbaeksang/solar-open2/apps/api/internal/provider"
)

func TestUpstageUsesAsymmetricEmbeddingModelsAndParsesChatSSE(t *testing.T) {
	t.Parallel()

	var models []string
	server := httptest.NewServer(http.HandlerFunc(func(response http.ResponseWriter, request *http.Request) {
		if request.Header.Get("Authorization") != "Bearer server-secret" {
			t.Error("server-side bearer token missing")
		}
		switch request.URL.Path {
		case "/embeddings":
			var body struct {
				Model string   `json:"model"`
				Input []string `json:"input"`
			}
			if err := json.NewDecoder(request.Body).Decode(&body); err != nil {
				t.Error(err)
			}
			models = append(models, body.Model)
			data := make([]map[string]any, len(body.Input))
			for index := range body.Input {
				vector := make([]float32, provider.EmbeddingDimension)
				vector[index] = 1
				data[index] = map[string]any{"index": index, "embedding": vector}
			}
			response.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(response).Encode(map[string]any{"data": data})
		case "/chat/completions":
			response.Header().Set("Content-Type", "text/event-stream")
			_, _ = io.WriteString(response, "data: {\"choices\":[{\"delta\":{\"content\":\"근거 \"}}]}\n\n")
			_, _ = io.WriteString(response, "data: {\"choices\":[{\"delta\":{\"content\":\"답변 [1]\"}}]}\n\n")
			_, _ = io.WriteString(response, "data: [DONE]\n\n")
		case "/messages":
			if request.Header.Get("Anthropic-Version") != "2023-06-01" {
				t.Error("Anthropic-Version header missing")
			}
			var body struct {
				Model           string `json:"model"`
				System          string `json:"system"`
				MaxTokens       int    `json:"max_tokens"`
				ReasoningEffort string `json:"reasoning_effort"`
			}
			if err := json.NewDecoder(request.Body).Decode(&body); err != nil {
				t.Error(err)
			}
			if body.Model != "solar-open2" ||
				body.System == "" ||
				body.MaxTokens != 1_200 ||
				body.ReasoningEffort != "none" {
				t.Errorf("invalid Solar Open 2 request: %#v", body)
			}
			response.Header().Set("Content-Type", "text/event-stream")
			_, _ = io.WriteString(response, "event: content_block_delta\n")
			_, _ = io.WriteString(response, "data: {\"type\":\"content_block_delta\",\"delta\":{\"type\":\"text_delta\",\"text\":\"오픈2 답변\"}}\n\n")
			_, _ = io.WriteString(response, "event: message_stop\n")
			_, _ = io.WriteString(response, "data: {\"type\":\"message_stop\"}\n\n")
		default:
			http.NotFound(response, request)
		}
	}))
	defer server.Close()

	client, err := provider.NewUpstage(provider.UpstageConfig{
		APIKey:       "server-secret",
		BaseURL:      server.URL,
		ChatModel:    "solar-pro3",
		ChatProtocol: "openai",
		Client:       server.Client(),
	})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := client.EmbedQuery(context.Background(), "질문"); err != nil {
		t.Fatal(err)
	}
	if _, err := client.EmbedPassages(context.Background(), []string{"근거"}); err != nil {
		t.Fatal(err)
	}
	if strings.Join(models, ",") != provider.QueryEmbeddingModel+","+provider.PassageEmbeddingModel {
		t.Fatalf("embedding models = %v", models)
	}

	stream, err := client.Stream(context.Background(), provider.ChatRequest{
		SystemPrompt: "검증된 근거만",
		UserPrompt:   "AI가 뭐야?",
	})
	if err != nil {
		t.Fatal(err)
	}
	defer stream.Close()
	first, err := stream.Recv()
	if err != nil || first != "근거 " {
		t.Fatalf("first delta = %q, %v", first, err)
	}
	second, err := stream.Recv()
	if err != nil || second != "답변 [1]" {
		t.Fatalf("second delta = %q, %v", second, err)
	}

	open2Client, err := provider.NewUpstage(provider.UpstageConfig{
		APIKey:       "server-secret",
		BaseURL:      server.URL,
		ChatModel:    "solar-open2",
		ChatProtocol: "anthropic",
		Client:       server.Client(),
	})
	if err != nil {
		t.Fatal(err)
	}
	open2Stream, err := open2Client.Stream(context.Background(), provider.ChatRequest{
		SystemPrompt: "검증된 근거만",
		UserPrompt:   "AI가 뭐야?",
	})
	if err != nil {
		t.Fatal(err)
	}
	defer open2Stream.Close()
	chunk, err := open2Stream.Recv()
	if err != nil || chunk != "오픈2 답변" {
		t.Fatalf("Solar Open 2 delta = %q, %v", chunk, err)
	}
}

func TestUpstageLiveChatAndEmbedding(t *testing.T) {
	if os.Getenv("UPSTAGE_INTEGRATION") != "1" {
		t.Skip("set UPSTAGE_INTEGRATION=1 to spend one live provider request")
	}
	client, err := provider.NewUpstage(provider.UpstageConfig{
		APIKey:       os.Getenv("UPSTAGE_API_KEY"),
		BaseURL:      os.Getenv("UPSTAGE_BASE_URL"),
		ChatModel:    os.Getenv("UPSTAGE_CHAT_MODEL"),
		ChatProtocol: os.Getenv("UPSTAGE_CHAT_PROTOCOL"),
	})
	if err != nil {
		t.Fatal(err)
	}
	vector, err := client.EmbedQuery(context.Background(), "AI의 작동 원리")
	if err != nil {
		t.Fatal(err)
	}
	if len(vector) != provider.EmbeddingDimension {
		t.Fatalf("live embedding dimension = %d", len(vector))
	}
	stream, err := client.Stream(context.Background(), provider.ChatRequest{
		SystemPrompt: "한국어로 한 문장만 답하고 URL은 쓰지 마라.",
		UserPrompt:   "AI는 무엇인가?",
	})
	if err != nil {
		t.Fatal(err)
	}
	defer stream.Close()
	var answer strings.Builder
	for {
		chunk, err := stream.Recv()
		if errors.Is(err, io.EOF) {
			break
		}
		if err != nil {
			t.Fatal(err)
		}
		answer.WriteString(chunk)
	}
	trimmed := strings.TrimSpace(answer.String())
	if len([]rune(trimmed)) < 20 {
		t.Fatalf("live chat returned an incomplete answer: %q", trimmed)
	}
}
