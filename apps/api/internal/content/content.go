package content

import (
	_ "embed"
	"encoding/json"
	"fmt"
	"sync"

	"github.com/Mrbaeksang/solar-open2/apps/api/internal/domain"
)

//go:embed corpus.json
var corpusJSON []byte

// Corpus is the validated build artifact produced from the MDX source of truth.
type Corpus struct {
	SchemaVersion int              `json:"schemaVersion"`
	Sources       []domain.Source  `json:"sources"`
	Passages      []domain.Passage `json:"passages"`
}

var (
	loadOnce   sync.Once
	loadCorpus Corpus
	loadError  error
)

// Load parses the embedded corpus once.
func Load() (Corpus, error) {
	loadOnce.Do(func() {
		loadError = json.Unmarshal(corpusJSON, &loadCorpus)
		if loadError == nil && loadCorpus.SchemaVersion != 1 {
			loadError = fmt.Errorf("unsupported corpus schema version %d", loadCorpus.SchemaVersion)
		}
	})
	return loadCorpus, loadError
}

// SourceRegistry resolves stable source IDs without trusting model output.
func (c Corpus) SourceRegistry() map[string]domain.Source {
	registry := make(map[string]domain.Source, len(c.Sources))
	for _, source := range c.Sources {
		registry[source.ID] = source
	}
	return registry
}
