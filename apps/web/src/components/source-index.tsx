"use client";

import { useMemo, useState } from "react";

import { claims, sources, type Source } from "@/lib/content";

const sourceKindLabels: Record<Source["kind"], string> = {
  "independent-public": "독립 공공기관",
  "education-consortium": "교육 컨소시엄",
  "primary-research": "1차 연구",
  "vendor-primary": "제조사 1차 자료",
};

export function SourceIndex() {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("ko");
    if (!normalized) {
      return sources;
    }
    return sources.filter((source) =>
      [
        source.publisher,
        source.title,
        source.editionOrVersion,
        source.publishedAt,
        source.license,
        source.summary,
      ]
        .join(" ")
        .toLocaleLowerCase("ko")
        .includes(normalized),
    );
  }, [query]);

  return (
    <section className="source-index" aria-labelledby="source-index-title">
      <div className="source-index-tools">
        <div>
          <h2 id="source-index-title">검증된 출처 {sources.length}개</h2>
          <p>
            제조사 자료는 제품별 사실에만 사용하고 독립 검증과 구분합니다.
          </p>
        </div>
        <label className="source-search">
          <span className="visually-hidden">출처 검색</span>
          <span aria-hidden="true">⌕</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="기관, 제목, 라이선스 검색"
          />
        </label>
      </div>
      <p className="source-result-count" role="status">
        {filtered.length}개 출처
      </p>
      <div className="source-index-list">
        {filtered.map((source, index) => {
          const links = claims.flatMap((claim) =>
            claim.sources
              .filter((link) => link.id === source.id)
              .map((link) => ({
                claimId: claim.id,
                claim: claim.text,
                locator: link.locator,
                track: claim.track,
                chapter: claim.chapterSlug,
              })),
          );
          return (
            <article className="source-index-card" key={source.id}>
              <div className="source-index-number">
                {String(index + 1).padStart(2, "0")}
              </div>
              <div className="source-index-body">
                <div className="source-index-badges">
                  <span className={`source-kind source-kind-${source.kind}`}>
                    {sourceKindLabels[source.kind]}
                  </span>
                  <span>검토 {source.reviewedAt}</span>
                </div>
                <p className="source-publisher">{source.publisher}</p>
                <h3>{source.title}</h3>
                <p>{source.summary}</p>
                <dl className="source-index-metadata">
                  <div>
                    <dt>판·버전</dt>
                    <dd>{source.editionOrVersion}</dd>
                  </div>
                  <div>
                    <dt>발행</dt>
                    <dd>{source.publishedAt}</dd>
                  </div>
                  <div>
                    <dt>라이선스</dt>
                    <dd>{source.license}</dd>
                  </div>
                  <div>
                    <dt>교재 연결</dt>
                    <dd>주장 {links.length}개</dd>
                  </div>
                </dl>
                <details className="source-locators">
                  <summary>정확한 위치와 연결 주장 {links.length}개</summary>
                  <ol>
                    {links.map((link) => (
                      <li key={`${link.claimId}:${link.locator}`}>
                        <strong>{link.locator}</strong>
                        <p>{link.claim}</p>
                        <small>
                          {link.track === "easy" ? "쉬운" : "기본"} 트랙 ·{" "}
                          {link.chapter}
                        </small>
                      </li>
                    ))}
                  </ol>
                </details>
                <p className="source-usage">
                  <strong>이 교재의 사용 범위</strong>
                  {source.usage}
                </p>
                <div className="source-actions">
                  <a href={source.url} target="_blank" rel="noreferrer">
                    출처 원문 <span aria-hidden="true">↗</span>
                  </a>
                  <a
                    href={source.licenseUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-link"
                  >
                    이용 조건
                  </a>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
