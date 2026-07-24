package retrieval_test

import (
	"context"
	"testing"

	"github.com/Mrbaeksang/solar-open2/apps/api/internal/domain"
	"github.com/Mrbaeksang/solar-open2/apps/api/internal/retrieval"
)

func TestMemorySearchPrioritizesSectionThenChapterAndNeverCrossesTrack(t *testing.T) {
	t.Parallel()

	store := retrieval.NewMemoryStore([]domain.Passage{
		{ID: "same-section", Track: "easy", ChapterID: "learning", SectionID: "pattern", Text: "데이터 패턴 학습 예측", SourceIDs: []string{"oecd"}},
		{ID: "same-chapter", Track: "easy", ChapterID: "learning", SectionID: "other", Text: "데이터 패턴 학습 예측", SourceIDs: []string{"oecd"}},
		{ID: "other-chapter", Track: "easy", ChapterID: "ai-is", SectionID: "meaning", Text: "데이터 패턴 학습 예측", SourceIDs: []string{"oecd"}},
		{ID: "wrong-track", Track: "standard", ChapterID: "learning", SectionID: "pattern", Text: "데이터 패턴 학습 예측", SourceIDs: []string{"oecd"}},
	})

	got, err := store.Search(context.Background(), domain.SearchQuery{
		Text:      "데이터 패턴으로 예측",
		Track:     "easy",
		ChapterID: "learning",
		SectionID: "pattern",
		Limit:     4,
	})
	if err != nil {
		t.Fatal(err)
	}
	if len(got) != 3 {
		t.Fatalf("expected three easy-track results, got %d", len(got))
	}
	if got[0].ID != "same-section" || got[1].ID != "same-chapter" {
		t.Fatalf("unexpected context ranking: %#v", got)
	}
	for _, passage := range got {
		if passage.Track == "standard" {
			t.Fatal("cross-track prose leaked into search")
		}
	}
}
