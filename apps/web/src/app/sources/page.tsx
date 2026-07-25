import type { Metadata } from "next";

import { SourceIndex } from "@/components/source-index";

export const metadata: Metadata = {
  title: "출처",
  description:
    "AI 쉽게 이해하기에서 사용한 기관, 문서, 정확한 위치, 이용 조건과 마지막 검토일을 확인합니다.",
};

export default function SourcesPage() {
  return (
    <main id="main-content" className="sources-page">
      <header className="sources-hero">
        <p className="hero-kicker">출처 목록 · 마지막 검토 2026-07-24</p>
        <h1>
          어떤 근거인지
          <br />
          <em>직접 확인하기</em>
        </h1>
        <p>
          문서를 만든 기관, 판과 날짜, 근거가 있는 정확한 위치, 이용
          조건을 확인할 수 있습니다.
        </p>
      </header>
      <SourceIndex />
    </main>
  );
}
