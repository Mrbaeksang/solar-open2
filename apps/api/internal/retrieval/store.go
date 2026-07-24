package retrieval

import (
	"context"

	"github.com/Mrbaeksang/solar-open2/apps/api/internal/domain"
)

// Store performs track-isolated hybrid retrieval.
type Store interface {
	Search(context.Context, domain.SearchQuery) ([]domain.Passage, error)
}

// Embedder produces asymmetric query and passage embeddings.
type Embedder interface {
	EmbedQuery(context.Context, string) ([]float32, error)
	EmbedPassages(context.Context, []string) ([][]float32, error)
	Dimension() int
}
