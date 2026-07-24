package retrieval

import (
	"context"
	"sort"
	"strings"
	"unicode"

	"github.com/Mrbaeksang/solar-open2/apps/api/internal/domain"
)

// MemoryStore mirrors ranking semantics for local development and black-box tests.
type MemoryStore struct {
	passages []domain.Passage
}

// NewMemoryStore creates an immutable in-memory corpus.
func NewMemoryStore(passages []domain.Passage) *MemoryStore {
	copied := append([]domain.Passage(nil), passages...)
	return &MemoryStore{passages: copied}
}

// Search combines token overlap with current section, chapter, and track boosts.
func (m *MemoryStore) Search(_ context.Context, query domain.SearchQuery) ([]domain.Passage, error) {
	if query.Limit <= 0 {
		query.Limit = 6
	}
	queryTokens := tokens(query.Text)
	results := make([]domain.Passage, 0, query.Limit)
	for _, passage := range m.passages {
		if passage.Track != query.Track && passage.Track != domain.TrackCommon {
			continue
		}
		score := lexicalScore(queryTokens, tokens(passage.Text))
		switch {
		case passage.Track == query.Track && passage.SectionID == query.SectionID && passage.ChapterID == query.ChapterID:
			score += 0.62
		case passage.Track == query.Track && passage.ChapterID == query.ChapterID:
			score += 0.34
		case passage.Track == query.Track:
			score += 0.12
		case passage.Track == domain.TrackCommon:
			score += 0.03
		}
		if score <= 0.03 {
			continue
		}
		result := passage
		result.Score = score
		results = append(results, result)
	}
	sort.SliceStable(results, func(left, right int) bool {
		if results[left].Score == results[right].Score {
			return results[left].ID < results[right].ID
		}
		return results[left].Score > results[right].Score
	})
	if len(results) > query.Limit {
		results = results[:query.Limit]
	}
	return results, nil
}

func lexicalScore(queryTokens, passageTokens map[string]struct{}) float64 {
	if len(queryTokens) == 0 {
		return 0
	}
	var matches int
	for token := range queryTokens {
		if _, exists := passageTokens[token]; exists {
			matches++
		}
	}
	return float64(matches) / float64(len(queryTokens))
}

func tokens(value string) map[string]struct{} {
	fields := strings.FieldsFunc(strings.ToLower(value), func(r rune) bool {
		return unicode.IsSpace(r) || unicode.IsPunct(r) || unicode.IsSymbol(r)
	})
	result := make(map[string]struct{}, len(fields))
	for _, field := range fields {
		trimmed := strings.TrimSpace(field)
		if len([]rune(trimmed)) >= 2 {
			result[trimmed] = struct{}{}
		}
	}
	return result
}
