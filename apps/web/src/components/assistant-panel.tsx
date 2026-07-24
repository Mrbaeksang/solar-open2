"use client";

import { HttpAgent } from "@ag-ui/client";
import {
  AssistantRuntimeProvider,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useAui,
  useAuiState,
} from "@assistant-ui/react";
import { useAgUiRuntime } from "@assistant-ui/react-ag-ui";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FC,
  type ReactNode,
} from "react";

import { getSource, getTrack, type Source } from "@/lib/content";
import type { LearningTrack, ReadingContext } from "@/lib/reading-context";

import { useReadingContext } from "./reading-context-provider";

type EvidenceStatus = "SUPPORTED" | "INSUFFICIENT" | "OUT_OF_SCOPE";

interface EvidenceEvent {
  status: EvidenceStatus;
  sourceIds: string[];
  sourceCount: number;
}

const evidenceLabels: Record<EvidenceStatus, string> = {
  SUPPORTED: "교재 근거 있음",
  INSUFFICIENT: "근거 부족",
  OUT_OF_SCOPE: "교재 범위 밖",
};

function sessionThreadId(track: LearningTrack) {
  if (typeof window === "undefined") {
    return `${track}-server-placeholder`;
  }
  const key = `solar-open2:${track}:thread`;
  const existing = window.sessionStorage.getItem(key);
  if (existing) {
    return existing;
  }
  const created = crypto.randomUUID();
  window.sessionStorage.setItem(key, created);
  return created;
}

async function inspectEventStream(
  response: Response,
  onEvidence: (event: EvidenceEvent) => void,
) {
  if (!response.body) {
    return;
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split(/\r?\n\r?\n/);
    buffer = frames.pop() ?? "";
    for (const frame of frames) {
      const payload = frame
        .split(/\r?\n/)
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trim())
        .join("\n");
      if (!payload) {
        continue;
      }
      try {
        const event = JSON.parse(payload) as {
          type?: string;
          name?: string;
          value?: unknown;
        };
        if (event.type === "CUSTOM" && event.name === "evidence") {
          const value = event.value as Partial<EvidenceEvent>;
          if (
            (value.status === "SUPPORTED" ||
              value.status === "INSUFFICIENT" ||
              value.status === "OUT_OF_SCOPE") &&
            Array.isArray(value.sourceIds)
          ) {
            onEvidence({
              status: value.status,
              sourceIds: value.sourceIds.filter(
                (sourceId): sourceId is string =>
                  typeof sourceId === "string" && Boolean(getSource(sourceId)),
              ),
              sourceCount:
                typeof value.sourceCount === "number"
                  ? value.sourceCount
                  : value.sourceIds.length,
            });
          }
        }
      } catch {
        // The protocol adapter handles malformed frames as the authoritative path.
      }
    }
  }
}

function createContextualFetch(
  contextRef: React.RefObject<ReadingContext>,
  setEvidence: (event: EvidenceEvent) => void,
) {
  return async (url: string, init: RequestInit) => {
    const original =
      typeof init.body === "string"
        ? (JSON.parse(init.body) as Record<string, unknown>)
        : {};
    const previousContext = Array.isArray(original.context)
      ? original.context.filter(
          (entry) =>
            !entry ||
            typeof entry !== "object" ||
            (entry as { description?: string }).description !==
              "reading-context",
        )
      : [];
    const body = {
      ...original,
      context: [
        ...previousContext,
        {
          description: "reading-context",
          value: JSON.stringify(contextRef.current),
        },
      ],
      forwardedProps: {
        ...(typeof original.forwardedProps === "object" &&
        original.forwardedProps !== null
          ? original.forwardedProps
          : {}),
        client: {
          name: "solar-open2-reader",
          readingContextVersion: 1,
        },
      },
    };
    const response = await fetch(url, {
      ...init,
      body: JSON.stringify(body),
      credentials: "omit",
    });
    void inspectEventStream(response.clone(), setEvidence);
    return response;
  };
}

export function AssistantPanel({ track }: { track: LearningTrack }) {
  const { context } = useReadingContext();
  const contextRef = useRef(context);
  const [evidence, setEvidence] = useState<EvidenceEvent>();
  const [threadId, setThreadId] = useState(`${track}-server-placeholder`);
  const [error, setError] = useState<string>();
  const apiURL =
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ??
    "http://127.0.0.1:8080";

  contextRef.current = context;
  useEffect(() => setThreadId(sessionThreadId(track)), [track]);

  const contextualFetch = useMemo(
    () => createContextualFetch(contextRef, setEvidence),
    [],
  );
  const agent = useMemo(
    () =>
      new HttpAgent({
        url: `${apiURL}/v1/agent`,
        threadId,
        fetch: contextualFetch,
      }),
    [apiURL, contextualFetch, threadId],
  );
  const runtime = useAgUiRuntime({
    agent,
    onError: () => {
      setError(
        "도우미 연결이 잠시 끊겼어요. 읽던 내용은 그대로이며, 잠시 뒤 다시 질문해 주세요.",
      );
    },
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <AssistantSurface
        track={track}
        evidence={evidence}
        error={error}
        clearError={() => setError(undefined)}
      />
    </AssistantRuntimeProvider>
  );
}

function AssistantSurface({
  track,
  evidence,
  error,
  clearError,
}: {
  track: LearningTrack;
  evidence?: EvidenceEvent;
  error?: string;
  clearError: () => void;
}) {
  const trackInfo = getTrack(track);
  const { context, chapterTitle, transitionNotice } = useReadingContext();
  const [open, setOpen] = useState(false);
  const aui = useAui();

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1180px)");
    const sync = () => setOpen(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const openPanel = () => setOpen(true);
    const sendPrompt = (event: Event) => {
      const prompt = (event as CustomEvent<{ text?: string }>).detail?.text;
      if (!prompt) {
        return;
      }
      setOpen(true);
      clearError();
      aui.composer().setText(prompt);
      window.setTimeout(() => aui.composer().send(), 0);
    };
    window.addEventListener("solar:assistant-open", openPanel);
    window.addEventListener("solar:assistant-prompt", sendPrompt);
    return () => {
      window.removeEventListener("solar:assistant-open", openPanel);
      window.removeEventListener("solar:assistant-prompt", sendPrompt);
    };
  }, [aui, clearError]);

  return (
    <>
      <button
        type="button"
        className="assistant-fab"
        aria-label="AI 도우미 열기"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <span aria-hidden="true">✦</span>
        <span>질문하기</span>
      </button>
      <aside
        className={`assistant-drawer ${open ? "is-open" : ""}`}
        role="dialog"
        aria-modal="false"
        aria-label={`${trackInfo.label} AI 도우미`}
        aria-hidden={!open}
      >
        <header className="assistant-header">
          <div className="assistant-identity">
            <span className="assistant-orb" aria-hidden="true">
              ✦
            </span>
            <div>
              <strong>{trackInfo.assistantName}</strong>
              <span>{trackInfo.label} 전용 · Solar Open 2</span>
            </div>
          </div>
          <button
            type="button"
            className="icon-button"
            aria-label="AI 도우미 닫기"
            onClick={() => setOpen(false)}
          >
            ×
          </button>
        </header>

        <div className="reading-context-chip">
          <span>지금 읽는 부분</span>
          <strong>
            {chapterTitle} · {context.sectionId}
          </strong>
          {context.selection ? <q>{context.selection}</q> : null}
        </div>

        {transitionNotice ? (
          <p className="context-transition" role="status">
            {transitionNotice}
          </p>
        ) : null}
        {error ? (
          <p className="assistant-error" role="alert">
            {error}
          </p>
        ) : null}

        <ThreadPrimitive.Root className="assistant-thread">
          <ThreadPrimitive.Viewport className="assistant-viewport">
            <div className="assistant-welcome">
              <strong>
                {track === "easy"
                  ? "궁금한 말을 짧게 물어보세요."
                  : "주장·원리·한계·근거 순서로 함께 검토합니다."}
              </strong>
              <p>
                개인정보는 적지 마세요. 답은 현재 트랙의 검수 원고만
                근거로 삼습니다.
              </p>
            </div>
            <ThreadPrimitive.Messages>
              {({ message }) =>
                message.role === "user" ? (
                  <UserMessage />
                ) : (
                  <AssistantMessage />
                )
              }
            </ThreadPrimitive.Messages>
            <ThreadPrimitive.ViewportFooter className="assistant-composer-sticky">
              <Composer />
            </ThreadPrimitive.ViewportFooter>
          </ThreadPrimitive.Viewport>
        </ThreadPrimitive.Root>

        {evidence ? <EvidencePanel event={evidence} /> : null}
        <p className="assistant-privacy">
          대화 원문은 서버에 저장하지 않습니다. 탭과 이 트랙을 벗어나면
          기억이 이어지지 않습니다.
        </p>
      </aside>
      {open ? (
        <button
          type="button"
          className="assistant-mobile-backdrop"
          aria-label="AI 도우미 닫기"
          onClick={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

const UserMessage: FC = () => (
  <MessagePrimitive.Root className="chat-message chat-message-user">
    <div>
      <MessagePrimitive.Parts />
    </div>
  </MessagePrimitive.Root>
);

const AssistantMessage: FC = () => (
  <MessagePrimitive.Root className="chat-message chat-message-assistant">
    <span className="chat-avatar" aria-hidden="true">
      ✦
    </span>
    <div>
      <MessagePrimitive.Parts />
    </div>
  </MessagePrimitive.Root>
);

function Composer() {
  const running = useAuiState((state) => state.thread.isRunning);
  return (
    <ComposerPrimitive.Root className="assistant-composer">
      <ComposerPrimitive.Input
        className="assistant-input"
        rows={2}
        placeholder="이 부분이 왜 그런지 물어보세요"
        aria-label="AI 도우미에게 질문"
      />
      <div>
        {running ? (
          <ComposerPrimitive.Cancel asChild>
            <button type="button" className="composer-button">
              멈춤
            </button>
          </ComposerPrimitive.Cancel>
        ) : (
          <ComposerPrimitive.Send asChild>
            <button type="button" className="composer-button">
              보내기
            </button>
          </ComposerPrimitive.Send>
        )}
      </div>
    </ComposerPrimitive.Root>
  );
}

function EvidencePanel({ event }: { event: EvidenceEvent }) {
  const linkedSources = event.sourceIds
    .map((sourceId) => getSource(sourceId))
    .filter((source): source is Source => Boolean(source));

  return (
    <section
      className={`evidence-panel evidence-${event.status.toLowerCase()}`}
      aria-label="최근 답변 근거 상태"
    >
      <div>
        <span className="evidence-dot" aria-hidden="true" />
        <strong>{evidenceLabels[event.status]}</strong>
        <span>출처 {linkedSources.length}개</span>
      </div>
      {linkedSources.length > 0 ? (
        <ul>
          {linkedSources.map((source, index) => (
            <li key={source.id}>
              <span>[{index + 1}]</span>
              <a href={source.url} target="_blank" rel="noreferrer">
                {source.publisher} · 출처 원문
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p>
          {event.status === "OUT_OF_SCOPE"
            ? "교재 밖의 사실을 지어내지 않고 멈췄습니다."
            : "확인할 교재 근거를 충분히 찾지 못했습니다."}
        </p>
      )}
    </section>
  );
}
