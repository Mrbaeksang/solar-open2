package domain_test

import (
	"encoding/json"
	"strings"
	"testing"

	"github.com/Mrbaeksang/solar-open2/apps/api/internal/domain"
)

func TestReadingContextRejectsDOMAndBoundsText(t *testing.T) {
	t.Parallel()

	raw := `{
		"track":"easy",
		"chapterId":"ai-is",
		"sectionId":"meaning",
		"selection":"` + strings.Repeat("가", 700) + `",
		"visibleContext":"` + strings.Repeat("나", 1200) + `",
		"sourceIds":["oecd-ailit-2026"],
		"rawDom":"<main>secret</main>"
	}`

	var got domain.ReadingContext
	if err := json.Unmarshal([]byte(raw), &got); err == nil {
		t.Fatal("expected unknown raw DOM field to be rejected")
	}
}

func TestEvidenceHasOnlyThreeHonestStates(t *testing.T) {
	t.Parallel()

	for _, state := range []domain.EvidenceState{
		domain.EvidenceSupported,
		domain.EvidenceInsufficient,
		domain.EvidenceOutOfScope,
	} {
		if err := state.Validate(); err != nil {
			t.Fatalf("state %q should be valid: %v", state, err)
		}
	}

	if err := domain.EvidenceState("0.92").Validate(); err == nil {
		t.Fatal("numeric confidence must not be a public evidence state")
	}
}
