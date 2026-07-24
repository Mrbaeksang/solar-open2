"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import {
  getClaim,
  getClaimNumber,
  getSource,
  type Source,
} from "@/lib/content";

const sourceKindLabels: Record<Source["kind"], string> = {
  "independent-public": "독립 공공기관",
  "education-consortium": "교육 컨소시엄",
  "primary-research": "1차 연구",
  "vendor-primary": "제조사 1차 자료",
};

export function Cite({ claim: claimId }: { claim: string }) {
  const [open, setOpen] = useState(false);
  const tooltipId = useId();
  const claim = getClaim(claimId);
  const number = claim ? getClaimNumber(claim) : 0;
  const linkedSources = useMemo(
    () =>
      claim?.sources
        .map((link) => {
          const source = getSource(link.id);
          return source ? { source, locator: link.locator } : undefined;
        })
        .filter(
          (
            linked,
          ): linked is {
            source: Source;
            locator: string;
          } => Boolean(linked),
        ) ?? [],
    [claim],
  );

  useEffect(() => {
    if (!open) {
      return;
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  if (!claim || number < 1 || linkedSources.length === 0) {
    throw new Error(`검증되지 않은 claim ID: ${claimId}`);
  }

  return (
    <>
      <span className="citation-anchor">
        <button
          type="button"
          className="citation-marker"
          aria-label={`출처 ${number} 열기`}
          aria-describedby={tooltipId}
          aria-expanded={open}
          onClick={() => setOpen(true)}
        >
          {number}
        </button>
        <span id={tooltipId} role="tooltip" className="citation-tooltip">
          <span>{linkedSources[0].source.publisher}</span>
          <strong>{linkedSources[0].source.title}</strong>
          <small>{linkedSources[0].locator}</small>
        </span>
      </span>
      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              className="citation-backdrop"
              role="presentation"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                  setOpen(false);
                }
              }}
            >
              <section
                role="dialog"
                aria-modal="true"
                aria-label={`출처 자세히 보기 ${number}`}
                className="citation-dialog"
              >
                <header>
                  <div>
                    <span className="callout-kicker">주장 {number}의 근거</span>
                    <h2>출처 자세히 보기</h2>
                  </div>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label="출처 닫기"
                    onClick={() => setOpen(false)}
                    autoFocus
                  >
                    ×
                  </button>
                </header>
                <p className="claim-statement">{claim.text}</p>
                <div className="source-card-list">
                  {linkedSources.map(({ source, locator }) => (
                    <article className="source-card" key={source.id}>
                      <div className="source-card-meta">
                        <span
                          className={`source-kind source-kind-${source.kind}`}
                        >
                          {sourceKindLabels[source.kind]}
                        </span>
                        <span>검토 {source.reviewedAt}</span>
                      </div>
                      <p className="source-publisher">{source.publisher}</p>
                      <h3>{source.title}</h3>
                      <dl>
                        <div>
                          <dt>판·날짜</dt>
                          <dd>
                            {source.editionOrVersion} · {source.publishedAt}
                          </dd>
                        </div>
                        <div>
                          <dt>정확한 위치</dt>
                          <dd>{locator}</dd>
                        </div>
                        <div>
                          <dt>라이선스</dt>
                          <dd>{source.license}</dd>
                        </div>
                      </dl>
                      <p>{source.summary}</p>
                      <div className="source-actions">
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          출처 원문
                          <span aria-hidden="true"> ↗</span>
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
                    </article>
                  ))}
                </div>
              </section>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
