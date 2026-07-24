package evals_test

import (
	"context"
	"errors"
	"io"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/Mrbaeksang/solar-open2/apps/api/internal/agent"
	"github.com/Mrbaeksang/solar-open2/apps/api/internal/content"
	"github.com/Mrbaeksang/solar-open2/apps/api/internal/domain"
	"github.com/Mrbaeksang/solar-open2/apps/api/internal/provider"
	"github.com/Mrbaeksang/solar-open2/apps/api/internal/retrieval"
)

func TestGroundingPersonaScopeAndLatencyEval(t *testing.T) {
	t.Parallel()

	corpus, err := content.Load()
	if err != nil {
		t.Fatal(err)
	}
	runner, err := agent.NewRunner(
		context.Background(),
		retrieval.NewMemoryStore(corpus.Passages),
		provider.Deterministic{},
		provider.Deterministic{},
		corpus.Sources,
	)
	if err != nil {
		t.Fatal(err)
	}
	registry := corpus.SourceRegistry()

	cases := []struct {
		name         string
		track        domain.Track
		chapter      string
		section      string
		question     string
		wantEvidence domain.EvidenceState
		wantPhrase   string
	}{
		{
			name:         "easy grounded answer",
			track:        domain.TrackEasy,
			chapter:      "ai-is",
			section:      "goal-tool",
			question:     "AI는 어떤 도구야?",
			wantEvidence: domain.EvidenceSupported,
			wantPhrase:   "AI는",
		},
		{
			name:         "standard research mentor structure",
			track:        domain.TrackStandard,
			chapter:      "generative-ai",
			section:      "language-patterns",
			question:     "언어 모델이 문장을 만드는 원리와 한계는?",
			wantEvidence: domain.EvidenceSupported,
			wantPhrase:   "주장:",
		},
		{
			name:         "honest out of scope response",
			track:        domain.TrackEasy,
			chapter:      "ai-is",
			section:      "goal-tool",
			question:     "오늘 날씨와 주식 종목을 알려줘",
			wantEvidence: domain.EvidenceOutOfScope,
			wantPhrase:   "범위",
		},
	}

	for _, testCase := range cases {
		testCase := testCase
		t.Run(testCase.name, func(t *testing.T) {
			t.Parallel()
			startedAt := time.Now()
			result, err := runner.Run(context.Background(), domain.AgentRequest{
				ThreadID: "eval-thread",
				RunID:    "eval-run",
				Question: testCase.question,
				Reading: domain.ReadingContext{
					Track:     testCase.track,
					ChapterID: testCase.chapter,
					SectionID: testCase.section,
					SourceIDs: nil,
				},
			})
			if err != nil {
				t.Fatal(err)
			}
			if elapsed := time.Since(startedAt); elapsed > time.Second {
				t.Fatalf("deterministic latency %s exceeds one-second eval budget", elapsed)
			}
			if result.Evidence.Status != testCase.wantEvidence {
				t.Fatalf("evidence = %s, want %s", result.Evidence.Status, testCase.wantEvidence)
			}
			for _, sourceID := range result.Evidence.SourceIDs {
				if _, known := registry[sourceID]; !known {
					t.Fatalf("answer exposed unknown source id %q", sourceID)
				}
			}
			if result.Evidence.Status != domain.EvidenceSupported && len(result.Evidence.SourceIDs) != 0 {
				t.Fatal("unsupported answers must not expose sources")
			}
			answer := readAll(t, result.Stream)
			if !strings.Contains(answer, testCase.wantPhrase) {
				t.Fatalf("answer %q lacks expected persona phrase %q", answer, testCase.wantPhrase)
			}
			if strings.Contains(answer, "http://") || strings.Contains(answer, "https://") {
				t.Fatal("model answer must never create a URL")
			}
			if result.Evidence.Status == domain.EvidenceSupported && !strings.Contains(answer, "[1]") {
				t.Fatal("supported answer lacks a source marker")
			}
		})
	}
}

func TestLiveSolarOpen2GroundedAnswer(t *testing.T) {
	if os.Getenv("UPSTAGE_INTEGRATION") != "1" {
		t.Skip("set UPSTAGE_INTEGRATION=1 to spend one live grounded-answer request")
	}
	corpus, err := content.Load()
	if err != nil {
		t.Fatal(err)
	}
	upstage, err := provider.NewUpstage(provider.UpstageConfig{
		APIKey:       os.Getenv("UPSTAGE_API_KEY"),
		BaseURL:      os.Getenv("UPSTAGE_BASE_URL"),
		ChatModel:    "solar-open2",
		ChatProtocol: os.Getenv("UPSTAGE_CHAT_PROTOCOL"),
	})
	if err != nil {
		t.Fatal(err)
	}
	captured := &captureModel{inner: upstage}
	runner, err := agent.NewRunner(
		context.Background(),
		retrieval.NewMemoryStore(corpus.Passages),
		upstage,
		captured,
		corpus.Sources,
	)
	if err != nil {
		t.Fatal(err)
	}
	result, err := runner.Run(context.Background(), domain.AgentRequest{
		ThreadID: "live-eval",
		RunID:    "live-eval",
		Question: "AI는 어떤 도구야?",
		Reading: domain.ReadingContext{
			Track:     domain.TrackEasy,
			ChapterID: "ai-is",
			SectionID: "goal-tool",
			SourceIDs: []string{"oecd-ai-definition-2024"},
		},
	})
	if err != nil {
		t.Fatal(err)
	}
	answer := readAll(t, result.Stream)
	if len([]rune(answer)) < 80 {
		t.Fatalf(
			"grounded answer is incomplete (%d chars, raw %d chars): answer=%q raw=%q",
			len([]rune(answer)),
			len([]rune(captured.raw.String())),
			answer,
			captured.raw.String(),
		)
	}
	if !strings.Contains(answer, "[1]") || strings.Contains(answer, "http") {
		t.Fatalf("grounded answer failed citation guard: %q", answer)
	}
}

type captureModel struct {
	inner provider.ChatModel
	raw   strings.Builder
}

func (m *captureModel) Stream(
	ctx context.Context,
	request provider.ChatRequest,
) (domain.TextStream, error) {
	stream, err := m.inner.Stream(ctx, request)
	if err != nil {
		return nil, err
	}
	return &captureStream{inner: stream, raw: &m.raw}, nil
}

type captureStream struct {
	inner domain.TextStream
	raw   *strings.Builder
}

func (s *captureStream) Recv() (string, error) {
	chunk, err := s.inner.Recv()
	s.raw.WriteString(chunk)
	return chunk, err
}

func (s *captureStream) Close() error {
	return s.inner.Close()
}

func readAll(t *testing.T, stream domain.TextStream) string {
	t.Helper()
	defer stream.Close()
	var builder strings.Builder
	for {
		chunk, err := stream.Recv()
		if errors.Is(err, io.EOF) {
			return builder.String()
		}
		if err != nil {
			t.Fatal(err)
		}
		builder.WriteString(chunk)
	}
}
