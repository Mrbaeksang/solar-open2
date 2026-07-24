import Link from "next/link";

import {
  getChapterSources,
  type Chapter,
  type Source,
} from "@/lib/content";

const sourceKindLabels: Record<Source["kind"], string> = {
  "independent-public": "독립 공공기관",
  "education-consortium": "교육 컨소시엄",
  "primary-research": "1차 연구",
  "vendor-primary": "제조사 1차 자료",
};

export function Bibliography({ chapter }: { chapter: Chapter }) {
  const chapterSources = getChapterSources(chapter);

  return (
    <section className="bibliography" aria-labelledby="chapter-sources-title">
      <div className="bibliography-heading">
        <div>
          <span className="callout-kicker">이 장의 검증 기록</span>
          <h2 id="chapter-sources-title">참고문헌</h2>
        </div>
        <Link href="/sources">전체 출처 인덱스</Link>
      </div>
      <ol>
        {chapterSources.map((source) => (
          <li key={source.id}>
            <span className={`source-kind source-kind-${source.kind}`}>
              {sourceKindLabels[source.kind]}
            </span>
            <p>
              <strong>{source.publisher}.</strong> {source.title}.{" "}
              {source.editionOrVersion}, {source.publishedAt}.
            </p>
            <a href={source.url} target="_blank" rel="noreferrer">
              원문
              <span aria-hidden="true"> ↗</span>
            </a>
          </li>
        ))}
      </ol>
      <p className="review-pending">
        외부 기술·연령 적합성 검토 대기 ·{" "}
        <a
          href={`https://github.com/Mrbaeksang/solar-open2/issues/${chapter.review.issue}`}
          target="_blank"
          rel="noreferrer"
        >
          검토 게이트 #{chapter.review.issue}
        </a>
      </p>
    </section>
  );
}
