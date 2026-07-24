package agui_test

import (
	"bufio"
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/Mrbaeksang/solar-open2/apps/api/internal/agent"
	"github.com/Mrbaeksang/solar-open2/apps/api/internal/domain"
	"github.com/Mrbaeksang/solar-open2/apps/api/internal/transport/agui"
)

func TestHandlerStreamsProtocolEventsAndRegistryBackedEvidence(t *testing.T) {
	t.Parallel()

	runner := agent.NewDeterministicRunner([]domain.Source{
		{ID: "oecd-ailit-2026", URL: "https://www.oecd.org/example"},
	})
	handler := agui.NewHandler(runner, agui.Options{AllowedOrigins: []string{"http://localhost:3000"}})

	body := `{
		"threadId":"thread-a",
		"runId":"run-a",
		"state":{},
		"messages":[{"id":"m1","role":"user","content":"AI가 뭐야?"}],
		"tools":[],
		"context":[{"description":"reading-context","value":"{\"track\":\"easy\",\"chapterId\":\"ai-is\",\"sectionId\":\"meaning\",\"sourceIds\":[\"oecd-ailit-2026\"]}"}],
		"forwardedProps":{}
	}`
	request := httptest.NewRequest(http.MethodPost, "/v1/agent", strings.NewReader(body))
	request.Header.Set("Origin", "http://localhost:3000")
	response := httptest.NewRecorder()

	handler.ServeHTTP(response, request)

	if response.Code != http.StatusOK {
		t.Fatalf("unexpected status %d: %s", response.Code, response.Body.String())
	}
	if got := response.Header().Get("Content-Type"); !strings.Contains(got, "text/event-stream") {
		t.Fatalf("unexpected content type %q", got)
	}

	var eventTypes []string
	scanner := bufio.NewScanner(bytes.NewReader(response.Body.Bytes()))
	for scanner.Scan() {
		line := scanner.Text()
		if !strings.HasPrefix(line, "data: ") {
			continue
		}
		var event struct {
			Type string `json:"type"`
			Name string `json:"name"`
		}
		if err := json.Unmarshal([]byte(strings.TrimPrefix(line, "data: ")), &event); err != nil {
			t.Fatal(err)
		}
		eventTypes = append(eventTypes, event.Type)
	}

	want := []string{
		"RUN_STARTED",
		"CUSTOM",
		"TEXT_MESSAGE_START",
		"TEXT_MESSAGE_CONTENT",
		"TEXT_MESSAGE_END",
		"RUN_FINISHED",
	}
	if strings.Join(eventTypes, ",") != strings.Join(want, ",") {
		t.Fatalf("event order = %v, want %v", eventTypes, want)
	}
}

func TestHandlerLimitsAnonymousCostWithoutPersistingRawAddress(t *testing.T) {
	t.Parallel()

	runner := agent.NewDeterministicRunner([]domain.Source{
		{ID: "oecd-ailit-2026", URL: "https://www.oecd.org/example"},
	})
	handler := agui.NewHandler(runner, agui.Options{
		AllowedOrigins:    []string{"http://localhost:3000"},
		RequestsPerMinute: 1,
		MaxConcurrentRuns: 1,
	})
	body := `{
		"threadId":"thread-a",
		"runId":"run-a",
		"messages":[{"id":"m1","role":"user","content":"AI가 뭐야?"}],
		"context":[{"description":"reading-context","value":"{\"track\":\"easy\",\"chapterId\":\"ai-is\",\"sectionId\":\"meaning\",\"sourceIds\":[\"oecd-ailit-2026\"]}"}]
	}`

	first := httptest.NewRequest(http.MethodPost, "/v1/agent", strings.NewReader(body))
	first.RemoteAddr = "203.0.113.5:12000"
	firstResponse := httptest.NewRecorder()
	handler.ServeHTTP(firstResponse, first)
	if firstResponse.Code != http.StatusOK {
		t.Fatalf("first request status = %d", firstResponse.Code)
	}

	second := httptest.NewRequest(http.MethodPost, "/v1/agent", strings.NewReader(body))
	second.RemoteAddr = "203.0.113.5:12001"
	secondResponse := httptest.NewRecorder()
	handler.ServeHTTP(secondResponse, second)
	if secondResponse.Code != http.StatusTooManyRequests {
		t.Fatalf("second request status = %d, want %d", secondResponse.Code, http.StatusTooManyRequests)
	}
}
