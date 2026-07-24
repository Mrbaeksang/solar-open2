package domain

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"strings"
	"unicode/utf8"
)

// Track identifies one independently authored learning track.
type Track string

const (
	TrackEasy     Track = "easy"
	TrackStandard Track = "standard"
	TrackCommon   Track = "common"
)

// Validate checks that a track can be used for reader-scoped retrieval.
func (t Track) Validate() error {
	if t != TrackEasy && t != TrackStandard {
		return fmt.Errorf("unsupported learning track %q", t)
	}
	return nil
}

// EvidenceState is the public, non-numeric statement about an answer's support.
type EvidenceState string

const (
	EvidenceSupported    EvidenceState = "SUPPORTED"
	EvidenceInsufficient EvidenceState = "INSUFFICIENT"
	EvidenceOutOfScope   EvidenceState = "OUT_OF_SCOPE"
)

// Validate rejects internal scores and any state outside the public contract.
func (s EvidenceState) Validate() error {
	switch s {
	case EvidenceSupported, EvidenceInsufficient, EvidenceOutOfScope:
		return nil
	default:
		return fmt.Errorf("invalid evidence state %q", s)
	}
}

// Source is one stable entry in the server-side source registry.
type Source struct {
	ID               string `json:"id"`
	Publisher        string `json:"publisher"`
	Title            string `json:"title"`
	EditionOrVersion string `json:"editionOrVersion"`
	PublishedAt      string `json:"publishedAt"`
	Summary          string `json:"summary"`
	License          string `json:"license"`
	LicenseURL       string `json:"licenseUrl"`
	URL              string `json:"url"`
	ReviewedAt       string `json:"reviewedAt"`
	Kind             string `json:"kind"`
	Usage            string `json:"usage"`
}

// Passage is a reviewed textbook section or a shared source summary.
type Passage struct {
	ID           string   `json:"id"`
	Track        Track    `json:"track"`
	ChapterID    string   `json:"chapterId"`
	ChapterTitle string   `json:"chapterTitle"`
	SectionID    string   `json:"sectionId"`
	SectionTitle string   `json:"sectionTitle"`
	Text         string   `json:"text"`
	SourceIDs    []string `json:"sourceIds"`
	ClaimIDs     []string `json:"claimIds"`
	Score        float64  `json:"-"`
}

// SearchQuery supplies both semantic and location context to retrieval.
type SearchQuery struct {
	Text      string
	Track     Track
	ChapterID string
	SectionID string
	Vector    []float32
	Limit     int
}

// ReadingContext is the only reader state accepted from the browser.
type ReadingContext struct {
	Track          Track    `json:"track"`
	ChapterID      string   `json:"chapterId"`
	SectionID      string   `json:"sectionId"`
	Selection      string   `json:"selection,omitempty"`
	VisibleContext string   `json:"visibleContext,omitempty"`
	SourceIDs      []string `json:"sourceIds"`
}

// UnmarshalJSON deliberately rejects raw DOM and unrecognized personal fields.
func (r *ReadingContext) UnmarshalJSON(data []byte) error {
	type readingContextAlias ReadingContext
	var decoded readingContextAlias
	decoder := json.NewDecoder(bytes.NewReader(data))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&decoded); err != nil {
		return fmt.Errorf("invalid reading context: %w", err)
	}
	if decoder.Decode(&struct{}{}) != io.EOF {
		return errors.New("invalid reading context: trailing JSON")
	}
	*r = ReadingContext(decoded)
	return r.Validate()
}

// Validate bounds the semantic reading context and rejects path-like identifiers.
func (r ReadingContext) Validate() error {
	if err := r.Track.Validate(); err != nil {
		return err
	}
	if !safeIdentifier(r.ChapterID) || !safeIdentifier(r.SectionID) {
		return errors.New("reading context contains an invalid location")
	}
	if utf8.RuneCountInString(r.Selection) > 500 {
		return errors.New("reading context selection is too long")
	}
	if utf8.RuneCountInString(r.VisibleContext) > 800 {
		return errors.New("reading context visible text is too long")
	}
	if len(r.SourceIDs) > 12 {
		return errors.New("reading context has too many source ids")
	}
	for _, sourceID := range r.SourceIDs {
		if !safeIdentifier(sourceID) {
			return errors.New("reading context contains an invalid source id")
		}
	}
	return nil
}

func safeIdentifier(value string) bool {
	if value == "" || len(value) > 64 {
		return false
	}
	for index, r := range value {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || (r == '-' && index > 0) {
			continue
		}
		return false
	}
	return true
}

// ChatMessage is a sanitized conversation item passed to the model.
type ChatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// AgentRequest is one stateless run assembled from the AG-UI request.
type AgentRequest struct {
	ThreadID      string
	RunID         string
	Question      string
	Messages      []ChatMessage
	Reading       ReadingContext
	RequestOrigin string
}

// Evidence contains only source IDs that passed registry validation.
type Evidence struct {
	Status    EvidenceState `json:"status"`
	SourceIDs []string      `json:"sourceIds"`
}

// TextStream is the minimal streaming boundary between model and transport.
type TextStream interface {
	Recv() (string, error)
	Close() error
}

// AgentResult starts with evidence metadata and then yields answer text.
type AgentResult struct {
	Evidence Evidence
	Stream   TextStream
}

// Runner prepares retrieval and returns a stream without persisting raw messages.
type Runner interface {
	Run(context.Context, AgentRequest) (*AgentResult, error)
}

// RunMetric is deliberately aggregate-only: it contains no prompt, answer, IP, or ID.
type RunMetric struct {
	Track         Track
	Evidence      EvidenceState
	SourceCount   int
	LatencyMillis int64
	InputChars    int
	OutputChars   int
	ErrorCategory string
}

// MetricRecorder accepts privacy-preserving operational counters.
type MetricRecorder interface {
	Record(RunMetric)
}

// SliceTextStream is a deterministic in-memory stream used by policy paths and tests.
type SliceTextStream struct {
	chunks []string
	index  int
}

// NewSliceTextStream splits text into bounded rune chunks.
func NewSliceTextStream(text string, runesPerChunk int) *SliceTextStream {
	if runesPerChunk < 1 {
		runesPerChunk = 32
	}
	runes := []rune(text)
	chunks := make([]string, 0, len(runes)/runesPerChunk+1)
	for start := 0; start < len(runes); start += runesPerChunk {
		end := min(start+runesPerChunk, len(runes))
		chunks = append(chunks, string(runes[start:end]))
	}
	return &SliceTextStream{chunks: chunks}
}

// Recv returns the next text delta.
func (s *SliceTextStream) Recv() (string, error) {
	if s.index >= len(s.chunks) {
		return "", io.EOF
	}
	chunk := s.chunks[s.index]
	s.index++
	return chunk, nil
}

// Close discards remaining chunks.
func (s *SliceTextStream) Close() error {
	s.index = len(s.chunks)
	return nil
}

// UniqueKnownSourceIDs preserves order while validating against a registry.
func UniqueKnownSourceIDs(sourceIDs []string, registry map[string]Source, limit int) []string {
	if limit < 1 {
		return nil
	}
	seen := make(map[string]struct{}, len(sourceIDs))
	result := make([]string, 0, min(len(sourceIDs), limit))
	for _, sourceID := range sourceIDs {
		if _, exists := registry[sourceID]; !exists {
			continue
		}
		if _, duplicate := seen[sourceID]; duplicate {
			continue
		}
		seen[sourceID] = struct{}{}
		result = append(result, sourceID)
		if len(result) == limit {
			break
		}
	}
	return result
}

// CompactText collapses whitespace before prompts or metrics count it.
func CompactText(value string) string {
	return strings.Join(strings.Fields(value), " ")
}
