package agent

import (
	"errors"
	"io"
	"strings"
	"testing"

	"github.com/cloudwego/eino/schema"
)

func TestSafeMessageStreamValidatesAcrossProviderDeltas(t *testing.T) {
	t.Parallel()

	source := messageStream(
		"설명 https",
		"://untrusted.example/path [9]",
		" 그리고 검증된 근거 [2]",
	)
	stream := newSafeMessageStream(source, 2)
	defer stream.Close()

	answer := receiveAll(t, stream)
	if strings.Contains(answer, "untrusted.example") {
		t.Fatalf("unsafe URL leaked across deltas: %q", answer)
	}
	if !strings.Contains(answer, "[링크 제거]") {
		t.Fatalf("removed URL was not disclosed: %q", answer)
	}
	if strings.Contains(answer, "[9]") {
		t.Fatalf("out-of-range citation leaked across deltas: %q", answer)
	}
	if !strings.Contains(answer, "[2]") {
		t.Fatalf("valid citation was removed: %q", answer)
	}
}

func TestSafeMessageStreamAddsCitationWhenModelOmitsOne(t *testing.T) {
	t.Parallel()

	stream := newSafeMessageStream(messageStream("근거를 풀어 쓴 답변"), 1)
	defer stream.Close()

	if answer := receiveAll(t, stream); answer != "근거를 풀어 쓴 답변 [1]" {
		t.Fatalf("answer = %q", answer)
	}
}

func messageStream(chunks ...string) *schema.StreamReader[*schema.Message] {
	reader, writer := schema.Pipe[*schema.Message](len(chunks))
	for _, chunk := range chunks {
		writer.Send(schema.AssistantMessage(chunk, nil), nil)
	}
	writer.Close()
	return reader
}

func receiveAll(t *testing.T, stream *safeMessageStream) string {
	t.Helper()

	var answer strings.Builder
	for {
		chunk, err := stream.Recv()
		if errors.Is(err, io.EOF) {
			return answer.String()
		}
		if err != nil {
			t.Fatal(err)
		}
		answer.WriteString(chunk)
	}
}
