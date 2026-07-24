package agent

import (
	"context"
	"errors"
	"io"
	"strings"
	"testing"
	"time"

	"github.com/Mrbaeksang/solar-open2/apps/api/internal/domain"
	"github.com/Mrbaeksang/solar-open2/apps/api/internal/provider"
	"github.com/Mrbaeksang/solar-open2/apps/api/internal/retrieval"
)

type gatedModel struct {
	release <-chan struct{}
}

func (model gatedModel) Stream(context.Context, provider.ChatRequest) (domain.TextStream, error) {
	return &gatedTextStream{release: model.release}, nil
}

type gatedTextStream struct {
	release <-chan struct{}
	index   int
}

func (stream *gatedTextStream) Recv() (string, error) {
	switch stream.index {
	case 0:
		stream.index++
		return "첫 토큰 ", nil
	case 1:
		stream.index++
		<-stream.release
		return "둘째 토큰 [1]", nil
	default:
		return "", io.EOF
	}
}

func (stream *gatedTextStream) Close() error {
	return nil
}

func TestRunnerReturnsBeforeModelStreamFinishes(t *testing.T) {
	t.Parallel()

	source := domain.Source{
		ID:  "src-one",
		URL: "https://example.com/source",
	}
	passage := domain.Passage{
		ID:           "passage-one",
		Track:        domain.TrackEasy,
		ChapterID:    "ai-is",
		ChapterTitle: "AI란 무엇인가",
		SectionID:    "meaning",
		SectionTitle: "AI의 뜻",
		Text:         "AI는 입력을 받아 알맞은 출력을 만드는 기술이다.",
		SourceIDs:    []string{source.ID},
	}
	release := make(chan struct{})
	runner, err := NewRunner(
		context.Background(),
		retrieval.NewMemoryStore([]domain.Passage{passage}),
		provider.Deterministic{},
		gatedModel{release: release},
		[]domain.Source{source},
	)
	if err != nil {
		t.Fatal(err)
	}

	resultChannel := make(chan *domain.AgentResult, 1)
	errorChannel := make(chan error, 1)
	go func() {
		result, runErr := runner.Run(context.Background(), domain.AgentRequest{
			Question: "AI는 입력을 어떻게 처리해?",
			Reading: domain.ReadingContext{
				Track:     domain.TrackEasy,
				ChapterID: "ai-is",
				SectionID: "meaning",
				SourceIDs: []string{source.ID},
			},
		})
		if runErr != nil {
			errorChannel <- runErr
			return
		}
		resultChannel <- result
	}()

	var result *domain.AgentResult
	select {
	case result = <-resultChannel:
	case runErr := <-errorChannel:
		t.Fatal(runErr)
	case <-time.After(150 * time.Millisecond):
		close(release)
		t.Fatal("Runner.Run buffered the model response instead of returning its live stream")
	}
	defer result.Stream.Close()

	first, err := result.Stream.Recv()
	if err != nil {
		t.Fatal(err)
	}
	if first != "첫 토큰 " {
		t.Fatalf("first streamed delta = %q", first)
	}

	close(release)
	var remainder strings.Builder
	for {
		chunk, streamErr := result.Stream.Recv()
		if errors.Is(streamErr, io.EOF) {
			break
		}
		if streamErr != nil {
			t.Fatal(streamErr)
		}
		remainder.WriteString(chunk)
	}
	if remainder.String() != "둘째 토큰 [1]" {
		t.Fatalf("remaining streamed deltas = %q", remainder.String())
	}
}
