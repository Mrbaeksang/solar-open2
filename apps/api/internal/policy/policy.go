package policy

import (
	"regexp"
	"strings"

	"github.com/Mrbaeksang/solar-open2/apps/api/internal/domain"
)

var (
	emailPattern = regexp.MustCompile(`(?i)\b[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}\b`)
	phonePattern = regexp.MustCompile(`\b01[016789][-\s]?\d{3,4}[-\s]?\d{4}\b`)
	longNumber   = regexp.MustCompile(`\b\d{6,}\b`)
)

// Result is a deterministic safety decision made before retrieval or model calls.
type Result struct {
	OriginalQuestion             string
	SanitizedQuestion            string
	Categories                   []string
	Blocked                      bool
	BlockReason                  string
	RequiresTrustedAdult         bool
	AllowCommercialPersuasion    bool
	ContainsPersonalData         bool
	ContainsInappropriateRequest bool
}

// Evaluate removes common identifiers and applies the track-specific protection policy.
func Evaluate(question string, track domain.Track) Result {
	result := Result{
		OriginalQuestion:          question,
		SanitizedQuestion:         domain.CompactText(question),
		AllowCommercialPersuasion: false,
	}
	sanitized := emailPattern.ReplaceAllString(result.SanitizedQuestion, "[개인정보 제거]")
	sanitized = phonePattern.ReplaceAllString(sanitized, "[개인정보 제거]")
	sanitized = longNumber.ReplaceAllString(sanitized, "[긴 번호 제거]")
	if sanitized != result.SanitizedQuestion {
		result.ContainsPersonalData = true
		result.Categories = append(result.Categories, "personal_data_redacted")
	}
	result.SanitizedQuestion = sanitized

	lower := strings.ToLower(question)
	if containsAny(lower,
		"광고 문구", "구매하게", "결제 유도", "몰래 사", "도박", "베팅", "코인 추천",
		"buy this", "advertise to", "gambling",
	) {
		result.Blocked = true
		result.BlockReason = "광고·구매 유도나 도박 요청은 도와줄 수 없습니다."
		result.Categories = append(result.Categories, "commercial_or_gambling")
	}
	if containsAny(lower,
		"성적인 사진", "음란", "나체", "잔인하게 죽", "폭탄 만드는", "해킹해서",
		"sexual image", "explicit minor", "make a bomb",
	) {
		result.Blocked = true
		result.ContainsInappropriateRequest = true
		result.BlockReason = "안전하지 않거나 부적절한 요청은 도와줄 수 없습니다."
		result.Categories = append(result.Categories, "unsafe_request")
	}

	if track == domain.TrackEasy && containsAny(lower,
		"약을", "진단", "죽고 싶", "자해", "괴롭힘", "폭력", "무서워", "불안해",
		"돈 보내", "송금", "협박", "medical", "suicide", "self-harm",
	) {
		result.RequiresTrustedAdult = true
		result.Categories = append(result.Categories, "trusted_adult_required")
	}
	return result
}

func containsAny(value string, candidates ...string) bool {
	for _, candidate := range candidates {
		if strings.Contains(value, candidate) {
			return true
		}
	}
	return false
}
