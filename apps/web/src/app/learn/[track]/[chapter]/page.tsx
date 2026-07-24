import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Bibliography } from "@/components/bibliography";
import { Quiz } from "@/components/quiz";
import { ReadingContextSync } from "@/components/reading-context-provider";
import { getChapterContent } from "@/content/modules";
import {
  chapters,
  getChapter,
  getChapterNeighbors,
  getChapters,
  getSectionContexts,
  getTrack,
  isLearningTrack,
} from "@/lib/content";

export const dynamicParams = false;

export function generateStaticParams() {
  return chapters.map((chapter) => ({
    track: chapter.track,
    chapter: chapter.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ track: string; chapter: string }>;
}): Promise<Metadata> {
  const { track, chapter: slug } = await params;
  if (!isLearningTrack(track)) {
    return {};
  }
  const chapter = getChapter(track, slug);
  return chapter
    ? {
        title: `${chapter.title} · ${getTrack(track).label}`,
        description: chapter.description,
      }
    : {};
}

export default async function ChapterPage({
  params,
}: {
  params: Promise<{ track: string; chapter: string }>;
}) {
  const { track, chapter: slug } = await params;
  if (!isLearningTrack(track)) {
    notFound();
  }
  const chapter = getChapter(track, slug);
  const Content = getChapterContent(track, slug);
  if (!chapter || !Content) {
    notFound();
  }

  const trackInfo = getTrack(track);
  const trackChapters = getChapters(track);
  const neighbors = getChapterNeighbors(chapter);
  const sectionContexts = getSectionContexts(track, slug);
  const alternateTrack = track === "easy" ? "standard" : "easy";

  return (
    <main id="main-content" className={`reader-page reader-${track}`}>
      <ReadingContextSync
        chapterId={chapter.slug}
        chapterTitle={chapter.title}
        sections={sectionContexts}
      />
      <div className="reader-topbar">
        <div>
          <span className="track-pill">{trackInfo.label}</span>
          <span>{trackInfo.audience}</span>
        </div>
        <Link href={`/learn/${alternateTrack}/${slug}`}>
          같은 주제, {getTrack(alternateTrack).label}으로
          <span aria-hidden="true"> ↗</span>
        </Link>
      </div>

      <div className="reader-layout">
        <aside className="chapter-sidebar" aria-label={`${trackInfo.label} 목차`}>
          <div className="sidebar-sticky">
            <p>AI 기초 교과서</p>
            <ol>
              {trackChapters.map((item) => (
                <li
                  key={item.slug}
                  className={item.slug === chapter.slug ? "is-current" : ""}
                >
                  <Link
                    href={`/learn/${track}/${item.slug}`}
                    aria-current={
                      item.slug === chapter.slug ? "page" : undefined
                    }
                  >
                    <span>{String(item.number).padStart(2, "0")}</span>
                    {item.title}
                  </Link>
                </li>
              ))}
            </ol>
            <Link href="/sources" className="sidebar-sources">
              <span aria-hidden="true">⌘</span>
              전체 출처 인덱스
            </Link>
          </div>
        </aside>

        <article className="chapter-article" data-chapter-article>
          <details className="mobile-toc">
            <summary>
              <span>목차</span>
              {chapter.number}. {chapter.title}
            </summary>
            <ol>
              {trackChapters.map((item) => (
                <li key={item.slug}>
                  <Link href={`/learn/${track}/${item.slug}`}>
                    {item.number}. {item.title}
                  </Link>
                </li>
              ))}
            </ol>
          </details>

          <header className="chapter-header">
            <p>
              Chapter {String(chapter.number).padStart(2, "0")} ·{" "}
              {chapter.eyebrow}
            </p>
            <h1>{chapter.title}</h1>
            <p className="chapter-description">{chapter.description}</p>
            <div className="chapter-meta">
              <span>약 {Math.max(6, chapter.number + 5)}분</span>
              <span>출처 {chapter.sourceIds.length}개</span>
              <span>확인 문제 1개</span>
            </div>
            <section className="learning-objectives" aria-label="이 장의 목표">
              <strong>읽고 나면</strong>
              <ul>
                {chapter.objectives.map((objective) => (
                  <li key={objective}>{objective}</li>
                ))}
              </ul>
            </section>
          </header>

          <nav className="section-jump" aria-label="이 장의 절">
            {chapter.sections.map((section, index) => (
              <a href={`#${section.id}`} key={section.id}>
                <span>{index + 1}</span>
                {section.title}
              </a>
            ))}
          </nav>

          <div className="mdx-content">
            <Content />
          </div>

          <Quiz quiz={chapter.quiz} />
          <Bibliography chapter={chapter} />

          <nav className="chapter-pagination" aria-label="앞뒤 챕터">
            {neighbors.previous ? (
              <Link
                href={`/learn/${track}/${neighbors.previous.slug}`}
                className="chapter-previous"
              >
                <span>← 이전</span>
                <strong>{neighbors.previous.title}</strong>
              </Link>
            ) : (
              <span />
            )}
            {neighbors.next ? (
              <Link
                href={`/learn/${track}/${neighbors.next.slug}`}
                className="chapter-next"
              >
                <span>다음 →</span>
                <strong>{neighbors.next.title}</strong>
              </Link>
            ) : (
              <Link href="/" className="chapter-next">
                <span>완료</span>
                <strong>홈으로 돌아가기</strong>
              </Link>
            )}
          </nav>
        </article>
      </div>
    </main>
  );
}
