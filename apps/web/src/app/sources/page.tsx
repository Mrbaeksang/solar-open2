import type { Metadata } from "next";

import { SourceIndex } from "@/components/source-index";

export const metadata: Metadata = {
  title: "출처 인덱스",
  description:
    "밝은 AI 교과서의 기관, 판, 날짜, locator, 라이선스와 마지막 검토일을 검색합니다.",
};

export default function SourcesPage() {
  return (
    <main id="main-content" className="sources-page">
      <header className="sources-hero">
        <p className="hero-kicker">Source registry · 마지막 검토 2026-07-24</p>
        <h1>
          링크보다 깊게,
          <br />
          <em>주장까지 추적합니다.</em>
        </h1>
        <p>
          기관과 제목만 모은 참고문헌이 아닙니다. 판·날짜·정확한
          locator·라이선스와 교재에서 연결된 모든 주장을 함께 확인하세요.
        </p>
      </header>
      <SourceIndex />
    </main>
  );
}
