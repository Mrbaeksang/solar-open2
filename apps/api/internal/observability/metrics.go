package observability

import (
	"encoding/json"
	"net/http"
	"sync"
	"time"

	"github.com/Mrbaeksang/solar-open2/apps/api/internal/domain"
)

// Metrics stores only aggregate counters in process memory.
type Metrics struct {
	mu           sync.RWMutex
	startedAt    time.Time
	runs         uint64
	failures     uint64
	sourceTotal  uint64
	latencyTotal uint64
	inputTotal   uint64
	outputTotal  uint64
	byTrack      map[domain.Track]uint64
	byEvidence   map[domain.EvidenceState]uint64
	byError      map[string]uint64
}

// NewMetrics creates a privacy-preserving aggregate recorder.
func NewMetrics() *Metrics {
	return &Metrics{
		startedAt:  time.Now().UTC(),
		byTrack:    make(map[domain.Track]uint64),
		byEvidence: make(map[domain.EvidenceState]uint64),
		byError:    make(map[string]uint64),
	}
}

// Record updates counters without retaining raw user content or identifiers.
func (m *Metrics) Record(metric domain.RunMetric) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.runs++
	m.byTrack[metric.Track]++
	if metric.Evidence != "" {
		m.byEvidence[metric.Evidence]++
	}
	if metric.ErrorCategory != "" {
		m.failures++
		m.byError[metric.ErrorCategory]++
	}
	if metric.SourceCount > 0 {
		m.sourceTotal += uint64(metric.SourceCount)
	}
	if metric.LatencyMillis > 0 {
		m.latencyTotal += uint64(metric.LatencyMillis)
	}
	if metric.InputChars > 0 {
		m.inputTotal += uint64(metric.InputChars)
	}
	if metric.OutputChars > 0 {
		m.outputTotal += uint64(metric.OutputChars)
	}
}

type snapshot struct {
	StartedAt          time.Time                       `json:"startedAt"`
	Runs               uint64                          `json:"runs"`
	Failures           uint64                          `json:"failures"`
	AverageSources     float64                         `json:"averageSources"`
	AverageLatencyMs   float64                         `json:"averageLatencyMs"`
	AverageInputChars  float64                         `json:"averageInputChars"`
	AverageOutputChars float64                         `json:"averageOutputChars"`
	ByTrack            map[domain.Track]uint64         `json:"byTrack"`
	ByEvidence         map[domain.EvidenceState]uint64 `json:"byEvidence"`
	ByError            map[string]uint64               `json:"byError"`
}

func (m *Metrics) current() snapshot {
	m.mu.RLock()
	defer m.mu.RUnlock()
	result := snapshot{
		StartedAt:  m.startedAt,
		Runs:       m.runs,
		Failures:   m.failures,
		ByTrack:    copyMap(m.byTrack),
		ByEvidence: copyMap(m.byEvidence),
		ByError:    copyMap(m.byError),
	}
	if m.runs > 0 {
		divisor := float64(m.runs)
		result.AverageSources = float64(m.sourceTotal) / divisor
		result.AverageLatencyMs = float64(m.latencyTotal) / divisor
		result.AverageInputChars = float64(m.inputTotal) / divisor
		result.AverageOutputChars = float64(m.outputTotal) / divisor
	}
	return result
}

// ServeHTTP exposes JSON counters suitable for a Railway health dashboard.
func (m *Metrics) ServeHTTP(response http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodGet {
		response.Header().Set("Allow", "GET")
		http.Error(response, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	response.Header().Set("Content-Type", "application/json")
	response.Header().Set("Cache-Control", "no-store")
	_ = json.NewEncoder(response).Encode(m.current())
}

func copyMap[K comparable](input map[K]uint64) map[K]uint64 {
	result := make(map[K]uint64, len(input))
	for key, value := range input {
		result[key] = value
	}
	return result
}
