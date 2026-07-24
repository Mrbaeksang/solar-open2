package agent

import (
	"errors"
	"io"
	"strconv"
	"strings"
	"unicode"
	"unicode/utf8"

	"github.com/cloudwego/eino/schema"
)

// safeMessageStream preserves provider deltas while withholding only the
// unfinished token needed to validate split URLs and citation markers.
type safeMessageStream struct {
	source      *schema.StreamReader[*schema.Message]
	pending     string
	sourceCount int
	inputRunes  int
	hasCitation bool
	hasText     bool
	finished    bool
}

func newSafeMessageStream(
	source *schema.StreamReader[*schema.Message],
	sourceCount int,
) *safeMessageStream {
	return &safeMessageStream{
		source:      source,
		sourceCount: sourceCount,
	}
}

func (stream *safeMessageStream) Recv() (string, error) {
	if stream.finished {
		return "", io.EOF
	}
	for {
		message, err := stream.source.Recv()
		if errors.Is(err, io.EOF) {
			stream.finished = true
			final := stream.sanitize(stream.pending)
			stream.pending = ""
			if stream.sourceCount > 0 && !stream.hasCitation {
				final += " [1]"
				stream.hasCitation = true
			}
			if strings.TrimSpace(final) != "" {
				stream.hasText = true
				return final, nil
			}
			if !stream.hasText {
				return "", errors.New("model returned an empty answer")
			}
			return "", io.EOF
		}
		if err != nil {
			stream.finished = true
			return "", err
		}
		if message == nil || message.Content == "" {
			continue
		}

		stream.inputRunes += utf8.RuneCountInString(message.Content)
		if stream.inputRunes > 12_000 {
			stream.finished = true
			return "", errors.New("model answer exceeded the output limit")
		}
		stream.pending += message.Content

		boundary := strings.LastIndexFunc(stream.pending, unicode.IsSpace)
		if boundary < 0 {
			continue
		}
		_, width := utf8.DecodeRuneInString(stream.pending[boundary:])
		ready := stream.pending[:boundary+width]
		stream.pending = stream.pending[boundary+width:]
		ready = stream.sanitize(ready)
		if ready == "" {
			continue
		}
		if strings.TrimSpace(ready) != "" {
			stream.hasText = true
		}
		return ready, nil
	}
}

func (stream *safeMessageStream) sanitize(text string) string {
	text = urlPattern.ReplaceAllString(text, "[링크 제거]")
	return citationPattern.ReplaceAllStringFunc(text, func(match string) string {
		parts := citationPattern.FindStringSubmatch(match)
		number, err := strconv.Atoi(parts[1])
		if err != nil || number < 1 || number > stream.sourceCount {
			return ""
		}
		stream.hasCitation = true
		return match
	})
}

func (stream *safeMessageStream) Close() error {
	stream.finished = true
	stream.source.Close()
	return nil
}
