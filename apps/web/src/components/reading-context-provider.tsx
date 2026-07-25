"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  sanitizeReadingContext,
  type LearningTrack,
  type ReadingContext,
} from "@/lib/reading-context";

interface SectionContext {
  title: string;
  sourceIds: string[];
}

interface ReadingContextValue {
  context: ReadingContext;
  chapterTitle: string;
  sectionTitle: string;
  transitionNotice?: string;
  syncChapter: (input: {
    chapterId: string;
    chapterTitle: string;
    firstSectionId: string;
    sections: Record<string, SectionContext>;
  }) => void;
  askSection: (sectionId: string) => void;
  openAssistant: () => void;
}

const ReadingContextContext = createContext<ReadingContextValue | null>(null);

function promptAssistant(text: string) {
  window.dispatchEvent(
    new CustomEvent("solar:assistant-prompt", {
      detail: { text },
    }),
  );
}

export function ReadingContextProvider({
  track,
  children,
}: {
  track: LearningTrack;
  children: ReactNode;
}) {
  const [context, setContext] = useState<ReadingContext>({
    track,
    chapterId: "ai-is",
    sectionId: "goal-tool",
    sourceIds: [],
  });
  const [chapterTitle, setChapterTitle] = useState("AI란 무엇인가");
  const [sections, setSections] = useState<Record<string, SectionContext>>({});
  const [transitionNotice, setTransitionNotice] = useState<string>();
  const [selection, setSelection] = useState<{
    text: string;
    sectionId: string;
    visibleContext: string;
    x: number;
    y: number;
  }>();

  useEffect(() => {
    if (!transitionNotice) {
      return;
    }
    const timeout = window.setTimeout(
      () => setTransitionNotice(undefined),
      4_500,
    );
    return () => window.clearTimeout(timeout);
  }, [transitionNotice]);

  const openAssistant = useCallback(() => {
    window.dispatchEvent(new CustomEvent("solar:assistant-open"));
  }, []);

  const syncChapter = useCallback(
    (input: {
      chapterId: string;
      chapterTitle: string;
      firstSectionId: string;
      sections: Record<string, SectionContext>;
    }) => {
      setContext((previous) => {
        if (previous.chapterId !== input.chapterId) {
          setTransitionNotice(
            `읽기 맥락 전환: ${input.chapterTitle} · 대화는 같은 ${track === "easy" ? "쉬운" : "기본"} 트랙 안에서만 이어집니다.`,
          );
        }
        return sanitizeReadingContext({
          track,
          chapterId: input.chapterId,
          sectionId: input.firstSectionId,
          sourceIds: input.sections[input.firstSectionId]?.sourceIds ?? [],
        });
      });
      setChapterTitle(input.chapterTitle);
      setSections(input.sections);
    },
    [track],
  );

  const askSection = useCallback(
    (sectionId: string) => {
      const element = document.querySelector<HTMLElement>(
        `[data-learning-section="${CSS.escape(sectionId)}"]`,
      );
      const section = sections[sectionId];
      const visibleContext = element?.innerText ?? "";
      setContext((previous) =>
        sanitizeReadingContext({
          ...previous,
          sectionId,
          visibleContext,
          sourceIds: section?.sourceIds ?? previous.sourceIds,
        }),
      );
      openAssistant();
      window.setTimeout(
        () =>
          promptAssistant(
            `지금 읽는 ‘${section?.title ?? "이 절"}’의 핵심을 설명하고, 내가 놓치기 쉬운 한계를 알려 줘.`,
          ),
        0,
      );
    },
    [openAssistant, sections],
  );

  useEffect(() => {
    const captureSelection = () => {
      const currentSelection = window.getSelection();
      const selectedText = currentSelection?.toString().replace(/\s+/g, " ").trim();
      if (!currentSelection || !selectedText || selectedText.length < 2) {
        setSelection(undefined);
        return;
      }
      const range = currentSelection.rangeCount
        ? currentSelection.getRangeAt(0)
        : undefined;
      const node = range?.commonAncestorContainer;
      const element =
        node?.nodeType === Node.ELEMENT_NODE
          ? (node as Element)
          : node?.parentElement;
      const section = element?.closest<HTMLElement>("[data-learning-section]");
      if (!range || !section || !section.closest("[data-chapter-article]")) {
        setSelection(undefined);
        return;
      }
      const rect = range.getBoundingClientRect();
      if (!rect.width && !rect.height) {
        return;
      }
      setSelection({
        text: [...selectedText].slice(0, 500).join(""),
        sectionId: section.dataset.learningSection ?? context.sectionId,
        visibleContext: [...section.innerText].slice(0, 800).join(""),
        x: Math.min(window.innerWidth - 132, Math.max(12, rect.left + rect.width / 2 - 58)),
        y: Math.min(window.innerHeight - 56, Math.max(12, rect.top - 52)),
      });
    };
    const clearSelection = () => setSelection(undefined);

    document.addEventListener("pointerup", captureSelection);
    document.addEventListener("keyup", captureSelection);
    document.addEventListener("selectionchange", captureSelection);
    window.addEventListener("scroll", clearSelection, true);
    return () => {
      document.removeEventListener("pointerup", captureSelection);
      document.removeEventListener("keyup", captureSelection);
      document.removeEventListener("selectionchange", captureSelection);
      window.removeEventListener("scroll", clearSelection, true);
    };
  }, [context.sectionId]);

  const value = useMemo<ReadingContextValue>(
    () => ({
      context,
      chapterTitle,
      sectionTitle: sections[context.sectionId]?.title ?? context.sectionId,
      transitionNotice,
      syncChapter,
      askSection,
      openAssistant,
    }),
    [
      askSection,
      chapterTitle,
      context,
      openAssistant,
      sections,
      syncChapter,
      transitionNotice,
    ],
  );

  return (
    <ReadingContextContext.Provider value={value}>
      {children}
      {selection ? (
        <button
          type="button"
          className="selection-question"
          style={{ left: selection.x, top: selection.y }}
          onPointerDown={(event) => event.preventDefault()}
          onClick={() => {
            const section = sections[selection.sectionId];
            setContext((previous) =>
              sanitizeReadingContext({
                ...previous,
                sectionId: selection.sectionId,
                selection: selection.text,
                visibleContext: selection.visibleContext,
                sourceIds: section?.sourceIds ?? previous.sourceIds,
              }),
            );
            setSelection(undefined);
            openAssistant();
            window.setTimeout(
              () =>
                promptAssistant(
                  "지금 선택한 부분을 먼저 한 문장으로 풀어 설명하고, 교재 근거와 비유의 한계를 알려 줘.",
                ),
              0,
            );
          }}
        >
          이 부분 질문
        </button>
      ) : null}
    </ReadingContextContext.Provider>
  );
}

export function useReadingContext() {
  const value = useContext(ReadingContextContext);
  if (!value) {
    throw new Error("ReadingContextProvider 안에서 사용해야 합니다.");
  }
  return value;
}

export function ReadingContextSync({
  chapterId,
  chapterTitle,
  sections,
}: {
  chapterId: string;
  chapterTitle: string;
  sections: Record<string, SectionContext>;
}) {
  const { syncChapter } = useReadingContext();
  const firstSectionId = Object.keys(sections)[0];

  useEffect(() => {
    if (firstSectionId) {
      syncChapter({ chapterId, chapterTitle, firstSectionId, sections });
    }
  }, [chapterId, chapterTitle, firstSectionId, sections, syncChapter]);

  return null;
}

export function AskSectionButton({ sectionId }: { sectionId: string }) {
  const { askSection } = useReadingContext();
  return (
    <button
      type="button"
      className="ask-section-button"
      onClick={() => askSection(sectionId)}
    >
      이 절 질문
    </button>
  );
}
