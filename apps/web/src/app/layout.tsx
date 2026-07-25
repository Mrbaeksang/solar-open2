import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { AstryxProvider } from "@/components/astryx-provider";

import "./astryx-layers.css";
import "@astryxdesign/core/reset.css";
import "@astryxdesign/core/astryx.css";
import "@astryxdesign/theme-neutral/theme.css";
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import "./globals.css";
import "./product-ui.css";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://solar-open2.vercel.app",
  ),
  title: {
    default: "AI 쉽게 이해하기",
    template: "%s · AI 쉽게 이해하기",
  },
  description:
    "AI의 기본 원리와 한계를 두 가지 난이도로 쉽게 배우고, 문장마다 근거를 확인하는 공개 학습 자료.",
  openGraph: {
    title: "AI 쉽게 이해하기",
    description:
      "AI가 무엇이고 어떻게 작동하며 왜 틀릴 수 있는지 쉬운 설명과 근거로 알아보세요.",
    type: "website",
    locale: "ko_KR",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko" data-theme="light" data-scroll-behavior="smooth">
      <body>
        <AstryxProvider>
          <a className="skip-link" href="#main-content">
            본문으로 바로가기
          </a>
          <header className="site-header">
            <div className="site-header-inner">
              <Link href="/" className="brand" aria-label="AI 쉽게 이해하기 홈">
                <span>
                  <strong>AI 쉽게 이해하기</strong>
                  <small>원리 · 한계 · 확인 방법</small>
                </span>
              </Link>
              <nav aria-label="주요 메뉴">
                <Link href="/learn/easy/ai-is">쉬운 트랙</Link>
                <Link href="/learn/standard/ai-is">기본 트랙</Link>
                <Link href="/sources">출처</Link>
              </nav>
            </div>
          </header>
          {children}
          <footer className="site-footer">
            <div>
              <p>
                <strong>AI 쉽게 이해하기</strong> · 로그인과 광고 없이
                공개합니다.
              </p>
              <p>
                검수된 자체 원고와 등록된 출처만 검색하며, 답변 원문은
                저장하지 않습니다.
              </p>
            </div>
            <div>
              <span>AI 모델로 답변 작성</span>
              <Link href="/sources">출처와 이용 조건</Link>
              <a
                href="https://github.com/Mrbaeksang/solar-open2"
                target="_blank"
                rel="noreferrer"
              >
                GitHub
              </a>
            </div>
          </footer>
        </AstryxProvider>
      </body>
    </html>
  );
}
