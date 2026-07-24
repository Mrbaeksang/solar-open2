package policy_test

import (
	"testing"

	"github.com/Mrbaeksang/solar-open2/apps/api/internal/domain"
	"github.com/Mrbaeksang/solar-open2/apps/api/internal/policy"
)

func TestPolicyRedactsPersonalDataAndProtectsYoungReaders(t *testing.T) {
	t.Parallel()

	result := policy.Evaluate(
		"내 전화번호는 010-1234-5678이고 주소는 서울시 어딘가야. 나 대신 약을 골라줘.",
		domain.TrackEasy,
	)

	if result.SanitizedQuestion == "" || result.SanitizedQuestion == result.OriginalQuestion {
		t.Fatal("personal data should be removed before model invocation")
	}
	if !result.RequiresTrustedAdult {
		t.Fatal("health/safety request in easy track should require a trusted adult")
	}
	if result.AllowCommercialPersuasion {
		t.Fatal("commercial persuasion must never be enabled")
	}
}
