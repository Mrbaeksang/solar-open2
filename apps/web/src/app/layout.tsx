import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://solar-open2.vercel.app",
  ),
  title: {
    default: "밝은 AI 교과서",
    template: "%s · 밝은 AI 교과서",
  },
  description:
    "두 읽기 수준으로 배우고, 주장마다 원출처를 확인하며, 읽는 자리에서 질문하는 공개 AI 리터러시 교과서.",
  openGraph: {
    title: "밝은 AI 교과서",
    description:
      "쉽게 읽고, 근거를 열고, 지금 읽는 부분을 AI 도우미에게 물어보세요.",
    type: "website",
    locale: "ko_KR",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko" data-scroll-behavior="smooth">
      <body>
        <a className="skip-link" href="#main-content">
          본문으로 바로가기
        </a>
        <header className="site-header">
          <div className="site-header-inner">
            <Link href="/" className="brand" aria-label="밝은 AI 교과서 홈">
              <span className="brand-mark" aria-hidden="true">
                ✦
              </span>
              <span>
                <strong>밝은 AI</strong>
                <small>근거가 보이는 교과서</small>
              </span>
            </Link>
            <nav aria-label="주요 메뉴">
              <Link href="/learn/easy/ai-is">쉬운 트랙</Link>
              <Link href="/learn/standard/ai-is">기본 트랙</Link>
              <Link href="/sources">출처 인덱스</Link>
            </nav>
          </div>
        </header>
        {children}
        <footer className="site-footer">
          <div>
            <p>
              <strong>밝은 AI 교과서</strong> · 로그인과 광고 없이 공개합니다.
            </p>
            <p>
              검수된 자체 원고만 검색합니다. 외부 기술·연령 적합성 검토 전
              V1 production 공개는 차단됩니다.
            </p>
          </div>
          <div>
            <span>Built with Solar Open 2</span>
            <Link href="/sources">Sources &amp; licenses</Link>
            <a
              href="https://github.com/Mrbaeksang/solar-open2"
              target="_blank"
              rel="noreferrer"
            >
              GitHub
            </a>
          </div>
        </footer>
      </body>
    </html>
  );
}
