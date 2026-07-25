"use client";

import { HttpAgent } from "@ag-ui/client";
import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import {
  ChatComposer,
  ChatMessage,
  ChatMessageBubble,
  ChatMessageList,
  ChatSendButton,
} from "@astryxdesign/core/Chat";
import { Citation } from "@astryxdesign/core/Citation";
import {
  AssistantRuntimeProvider,
  ComposerPrimitive,
  MessagePartPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useAui,
  useAuiState,
} from "@assistant-ui/react";
import {
  useAgUiRuntime,
  useAgUiState,
} from "@assistant-ui/react-ag-ui";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FC,
} from "react";

import { getSource, getTrack, type Source } from "@/lib/content";
import type { LearningTrack, ReadingContext } from "@/lib/reading-context";

import { useReadingContext } from "./reading-context-provider";

type EvidenceStatus = "SUPPORTED" | "INSUFFICIENT" | "OUT_OF_SCOPE";
type RetrievalStatus =
  | "checking"
  | "searching"
  | "complete"
  | "skipped"
  | "error";

interface EvidenceEvent {
  status: EvidenceStatus;
  sourceIds: string[];
  sourceCount: number;
}

interface RetrievalEvent {
  status: RetrievalStatus;
  passageCount: number;
  sourceCount: number;
}

interface AgentState {
  evidence?: unknown;
  retrieval?: unknown;
}

const evidenceLabels: Record<
  EvidenceStatus,
  { label: string; detail: string; variant: "success" | "warning" | "neutral" }
> = {
  SUPPORTED: {
    label: "교재 근거로 답함",
    detail: "아래 등록 출처와 연결된 검수 원고를 사용했습니다.",
    variant: "success",
  },
  INSUFFICIENT: {
    label: "근거를 찾지 못함",
    detail: "추측하지 않고, 지금 교재에서 확인할 수 있는 범위에 멈췄습니다.",
    variant: "warning",
  },
  OUT_OF_SCOPE: {
    label: "교재 범위 밖",
    detail: "AI 기초 교과서가 검증하지 않은 질문에는 답하지 않았습니다.",
    variant: "neutral",
  },
};

const suggestions: Record<
  LearningTrack,
  ReadonlyArray<{ label: string; prompt: string }>
> = {
  easy: [
    {
      label: "한 문장으로",
      prompt: "지금 읽는 부분의 핵심을 한 문장으로 먼저 설명해 줘.",
    },
    {
      label: "생활 예시로",
      prompt: "지금 읽는 원리를 생활 속 예시 하나로 설명하고 비유의 한계도 알려 줘.",
    },
    {
      label: "헷갈리기 쉬운 점",
      prompt: "지금 읽는 부분에서 사람들이 가장 자주 헷갈리는 점을 알려 줘.",
    },
  ],
  standard: [
    {
      label: "핵심 주장",
      prompt: "지금 읽는 부분의 핵심 주장과 작동 메커니즘을 구분해 설명해 줘.",
    },
    {
      label: "한계와 반례",
      prompt: "지금 읽는 설명이 성립하지 않는 한계나 반례를 검토해 줘.",
    },
    {
      label: "근거 따라가기",
      prompt: "지금 읽는 주장과 연결된 근거가 무엇을 뒷받침하는지 구분해 줘.",
    },
  ],
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

function createContextualFetch(
  contextRef: React.RefObject<ReadingContext>,
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

    return fetch(url, {
      ...init,
      body: JSON.stringify({
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
      }),
      credentials: "omit",
    });
  };
}

function readEvidence(state: AgentState | undefined): EvidenceEvent | undefined {
  const evidence = state?.evidence;
  if (!evidence || typeof evidence !== "object") {
    return undefined;
  }
  const value = evidence as Partial<EvidenceEvent>;
  if (
    value.status !== "SUPPORTED" &&
    value.status !== "INSUFFICIENT" &&
    value.status !== "OUT_OF_SCOPE"
  ) {
    return undefined;
  }
  const sourceIds = Array.isArray(value.sourceIds)
    ? value.sourceIds.filter(
        (sourceId): sourceId is string =>
          typeof sourceId === "string" && Boolean(getSource(sourceId)),
      )
    : [];
  return {
    status: value.status,
    sourceIds,
    sourceCount:
      typeof value.sourceCount === "number"
        ? value.sourceCount
        : sourceIds.length,
  };
}

function readRetrieval(
  state: AgentState | undefined,
): RetrievalEvent | undefined {
  const retrieval = state?.retrieval;
  if (!retrieval || typeof retrieval !== "object") {
    return undefined;
  }
  const value = retrieval as Partial<RetrievalEvent>;
  if (
    value.status !== "checking" &&
    value.status !== "searching" &&
    value.status !== "complete" &&
    value.status !== "skipped" &&
    value.status !== "error"
  ) {
    return undefined;
  }
  const safeCount = (count: unknown, limit: number) =>
    typeof count === "number" && Number.isFinite(count)
      ? Math.min(limit, Math.max(0, Math.trunc(count)))
      : 0;
  return {
    status: value.status,
    passageCount: safeCount(value.passageCount, 12),
    sourceCount: safeCount(value.sourceCount, 4),
  };
}

export function AssistantPanel({ track }: { track: LearningTrack }) {
  const { context } = useReadingContext();
  const contextRef = useRef(context);
  const [threadId, setThreadId] = useState(`${track}-server-placeholder`);
  const [error, setError] = useState<string>();
  const apiURL =
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ??
    "http://127.0.0.1:8080";

  contextRef.current = context;
  useEffect(() => setThreadId(sessionThreadId(track)), [track]);

  const contextualFetch = useMemo(
    () => createContextualFetch(contextRef),
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
        "도우미 연결이 잠시 끊겼습니다. 읽던 내용은 그대로이니 잠시 뒤 다시 질문해 주세요.",
      );
    },
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <AssistantSurface
        track={track}
        error={error}
        clearError={() => setError(undefined)}
      />
    </AssistantRuntimeProvider>
  );
}

function AssistantSurface({
  track,
  error,
  clearError,
}: {
  track: LearningTrack;
  error?: string;
  clearError: () => void;
}) {
  const trackInfo = getTrack(track);
  const { context, chapterTitle, sectionTitle, transitionNotice } =
    useReadingContext();
  const [open, setOpen] = useState(false);
  const state = useAgUiState<AgentState>();
  const evidence = readEvidence(state);
  const retrieval = readRetrieval(state);
  const running = useAuiState((runtimeState) => runtimeState.thread.isRunning);
  const [awaitingRetrievalState, setAwaitingRetrievalState] =
    useState(false);
  const previousRunning = useRef(false);
  const previousAgentState = useRef(state);
  const aui = useAui();

  useEffect(() => {
    if (running && !previousRunning.current) {
      setAwaitingRetrievalState(true);
    } else if (!running) {
      setAwaitingRetrievalState(false);
    }
    previousRunning.current = running;
  }, [running]);

  useEffect(() => {
    if (
      awaitingRetrievalState &&
      state !== previousAgentState.current
    ) {
      setAwaitingRetrievalState(false);
    }
    previousAgentState.current = state;
  }, [awaitingRetrievalState, state]);

  const visibleRetrieval = awaitingRetrievalState
    ? ({
        status: "checking",
        passageCount: 0,
        sourceCount: 0,
      } satisfies RetrievalEvent)
    : retrieval;

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
      {!open ? (
        <Button
          label="교재 도우미"
          icon={<SparkIcon />}
          variant="primary"
          size="lg"
          className="assistant-fab"
          aria-expanded={false}
          onClick={() => setOpen(true)}
        />
      ) : null}

      {open ? (
        <aside
          className="assistant-drawer is-open"
          aria-label={`${trackInfo.label} AI 교재 도우미`}
        >
          <header className="assistant-header">
            <div className="assistant-identity">
              <span className="assistant-orb" aria-hidden="true">
                <SparkIcon />
              </span>
              <div>
                <strong>{trackInfo.assistantName}</strong>
                <span>
                  {track === "easy"
                    ? "따뜻한 과학 길잡이"
                    : "차분한 연구 멘토"}
                  {" · "}Solar Open 2
                </span>
              </div>
            </div>
            <Button
              label="교재 도우미 닫기"
              icon={<CloseIcon />}
              isIconOnly
              variant="ghost"
              className="assistant-close"
              onClick={() => setOpen(false)}
            />
          </header>

          <div className="reading-context-chip" aria-label="도우미가 읽는 위치">
            <span>함께 보는 곳</span>
            <strong>{chapterTitle}</strong>
            <small>{sectionTitle}</small>
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
              <Conversation
                track={track}
                retrieval={visibleRetrieval}
              />

              {evidence ? <EvidencePanel event={evidence} /> : null}

              <ThreadPrimitive.ScrollToBottom asChild>
                <Button
                  label="최근 답변으로 이동"
                  icon={<ArrowDownIcon />}
                  isIconOnly
                  variant="secondary"
                  size="sm"
                  className="assistant-scroll-bottom"
                />
              </ThreadPrimitive.ScrollToBottom>

              <ThreadPrimitive.ViewportFooter className="assistant-composer-sticky">
                <Composer />
              </ThreadPrimitive.ViewportFooter>
            </ThreadPrimitive.Viewport>
          </ThreadPrimitive.Root>

          <p className="assistant-privacy">
            질문 원문은 저장하지 않습니다. 이름·연락처 같은 개인정보는 쓰지
            마세요.
          </p>
        </aside>
      ) : null}

      {open ? (
        <button
          type="button"
          className="assistant-mobile-backdrop"
          aria-label="교재 도우미 닫기"
          onClick={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

function Conversation({
  track,
  retrieval,
}: {
  track: LearningTrack;
  retrieval?: RetrievalEvent;
}) {
  const isEmpty = useAuiState((state) => state.thread.messages.length === 0);
  const running = useAuiState((state) => state.thread.isRunning);
  const lastMessageId = useAuiState((state) => {
    const messages = state.thread.messages;
    return messages[messages.length - 1]?.id;
  });
  const lastMessageRole = useAuiState((state) => {
    const messages = state.thread.messages;
    return messages[messages.length - 1]?.role;
  });
  if (isEmpty) {
    return <AssistantWelcome track={track} />;
  }
  return (
    <ChatMessageList
      density="compact"
      gap={3}
      isStreaming={running}
      className="assistant-message-list"
    >
      <ThreadPrimitive.Messages>
        {({ message }) =>
          message.role === "user" ? (
            <UserMessage />
          ) : (
            <AssistantMessage
              retrieval={
                message.id === lastMessageId ? retrieval : undefined
              }
            />
          )
        }
      </ThreadPrimitive.Messages>
      {lastMessageRole !== "assistant" &&
      retrieval &&
      retrieval.status !== "skipped" ? (
        <RetrievalActivity event={retrieval} />
      ) : null}
    </ChatMessageList>
  );
}

function AssistantWelcome({ track }: { track: LearningTrack }) {
  return (
    <section className="assistant-welcome" aria-labelledby="assistant-welcome">
      <p className="assistant-welcome-kicker">읽다가 막힌 바로 그 자리에서</p>
      <h2 id="assistant-welcome">
        {track === "easy"
          ? "어려운 말을 쉬운 예시부터 풀어볼까요?"
          : "주장과 근거를 나눠 차근히 검토해 볼까요?"}
      </h2>
      <p>
        지금 화면의 트랙·챕터·절과 선택한 문장만 참고합니다. 답은 검수된
        교재 범위를 벗어나지 않습니다.
      </p>
      <div className="assistant-suggestions" aria-label="추천 질문">
        {suggestions[track].map((suggestion) => (
          <ThreadPrimitive.Suggestion
            key={suggestion.label}
            prompt={suggestion.prompt}
            send
            asChild
          >
            <Button
              label={suggestion.label}
              variant="secondary"
              size="sm"
              className="assistant-suggestion"
            />
          </ThreadPrimitive.Suggestion>
        ))}
      </div>
    </section>
  );
}

const UserMessage: FC = () => (
  <MessagePrimitive.Root asChild>
    <ChatMessage
      sender="user"
      density="compact"
      className="chat-message chat-message-user"
    >
      <ChatMessageBubble
        variant="filled"
        name={<span className="chat-speaker">나</span>}
        className="chat-message-body"
      >
        <MessagePrimitive.Parts>
          {({ part }) =>
            part.type === "text" ? (
              <MessagePartPrimitive.Text component="p" />
            ) : null
          }
        </MessagePrimitive.Parts>
      </ChatMessageBubble>
    </ChatMessage>
  </MessagePrimitive.Root>
);

function AssistantMessage({
  retrieval,
}: {
  retrieval?: RetrievalEvent;
}) {
  return (
    <MessagePrimitive.Root asChild>
      <article
        data-role="assistant"
        className="astryx-chat-message chat-message chat-message-assistant"
        aria-label="교재 도우미 답변"
      >
        <span className="chat-avatar" aria-hidden="true">
          <SparkIcon />
        </span>
        <div className="chat-assistant-content">
          <span className="chat-speaker">교재 도우미</span>
          {retrieval && retrieval.status !== "skipped" ? (
            <RetrievalActivity event={retrieval} />
          ) : null}
          <MessagePrimitive.Parts>
            {({ part }) =>
              part.type === "text" ? (
                <p className="chat-answer">
                  <MessagePartPrimitive.Text
                    smooth={{
                      drainMs: 650,
                      maxCharsPerFrame: 10,
                      minCommitMs: 16,
                    }}
                  />
                  <MessagePartPrimitive.InProgress>
                    <span
                      className="stream-caret"
                      aria-label="답변 작성 중"
                    />
                  </MessagePartPrimitive.InProgress>
                </p>
              ) : null
            }
          </MessagePrimitive.Parts>
        </div>
      </article>
    </MessagePrimitive.Root>
  );
}

function Composer() {
  const running = useAuiState((state) => state.thread.isRunning);
  const text = useAuiState((state) => state.composer.text);
  const aui = useAui();
  return (
    <ComposerPrimitive.Root className="assistant-composer-runtime">
      <ChatComposer
        value={text}
        onChange={(value) => aui.composer().setText(value)}
        onSubmit={() => aui.composer().send()}
        onStop={() => aui.thread().cancelRun()}
        isStopShown={running}
        density="compact"
        className="assistant-composer-shell"
        input={
          <ComposerPrimitive.Input
            className="assistant-input"
            rows={1}
            maxLength={1_500}
            placeholder="읽다가 궁금한 점을 물어보세요"
            aria-label="AI 교재 도우미에게 질문"
            aria-describedby="assistant-composer-help"
            autoFocus={false}
            unstable_focusOnRunStart={false}
            unstable_focusOnScrollToBottom={false}
            unstable_focusOnThreadSwitched={false}
            submitMode="enter"
          />
        }
        footerActions={
          <small
            id="assistant-composer-help"
            className="assistant-composer-help"
          >
            Enter로 보내기 · Shift+Enter로 줄바꿈
          </small>
        }
        sendButton={
          <ChatSendButton
            isStopShown={running}
            onSend={() => aui.composer().send()}
            onStop={() => aui.thread().cancelRun()}
            isDisabled={!text.trim()}
            sendIcon={<SendIcon />}
            stopIcon={<StopIcon />}
            className="composer-button"
          />
        }
      />
    </ComposerPrimitive.Root>
  );
}

const retrievalMinimumVisibleMs = 700;

function RetrievalActivity({ event }: { event: RetrievalEvent }) {
  const isActive =
    event.status === "checking" || event.status === "searching";
  const [visibleEvent, setVisibleEvent] = useState(event);
  const [expanded, setExpanded] = useState(isActive);
  const activeStartedAt = useRef(isActive ? Date.now() : 0);

  useEffect(() => {
    if (isActive) {
      if (activeStartedAt.current === 0 || event.status === "checking") {
        activeStartedAt.current = Date.now();
      }
      setVisibleEvent(event);
      setExpanded(true);
      return;
    }

    if (event.status === "complete" && activeStartedAt.current > 0) {
      const elapsed = Date.now() - activeStartedAt.current;
      const remaining = Math.max(0, retrievalMinimumVisibleMs - elapsed);
      setVisibleEvent(event);
      setExpanded(remaining > 0);
      const timeout = window.setTimeout(() => {
        setExpanded(false);
        activeStartedAt.current = 0;
      }, remaining);
      return () => window.clearTimeout(timeout);
    }

    setVisibleEvent(event);
    setExpanded(event.status === "error");
    activeStartedAt.current = 0;
  }, [
    event.passageCount,
    event.sourceCount,
    event.status,
    isActive,
  ]);

  const visibleActive =
    visibleEvent.status === "checking" ||
    visibleEvent.status === "searching";
  const summary =
    visibleEvent.status === "checking"
      ? "질문과 읽는 위치 확인 중"
      : visibleEvent.status === "searching"
        ? "교재 시멘틱 검색 중"
        : visibleEvent.status === "error"
          ? "교재 검색을 완료하지 못함"
          : visibleEvent.passageCount > 0
            ? `시멘틱 검색 완료 · 근거 ${visibleEvent.passageCount}개 · 출처 ${visibleEvent.sourceCount}개`
            : "시멘틱 검색 완료 · 관련 근거 없음";

  return (
    <details
      className={`retrieval-activity retrieval-${visibleEvent.status}`}
      open={expanded}
      onToggle={(toggleEvent) =>
        setExpanded(toggleEvent.currentTarget.open)
      }
      aria-busy={visibleActive}
    >
      <summary>
        <span className="retrieval-activity-icon" aria-hidden="true">
          <SearchIcon />
        </span>
        <span className="retrieval-activity-label" role="status">
          {summary}
        </span>
        <span className="retrieval-activity-chevron" aria-hidden="true" />
      </summary>
      <div className="retrieval-activity-detail">
        <p>
          {visibleEvent.status === "checking"
            ? "질문 범위와 현재 보고 있는 교재 위치를 확인하고 있습니다."
            : visibleEvent.status === "searching"
              ? "질문의 의미·키워드·현재 절을 함께 비교하고 있습니다."
              : visibleEvent.status === "error"
                ? "검색 연결이 중단되었습니다. 질문을 다시 보내 주세요."
                : visibleEvent.passageCount > 0
                  ? `검수된 교재 조각 ${visibleEvent.passageCount}개를 확인하고 출처 ${visibleEvent.sourceCount}개를 연결했습니다.`
                  : "답변에 사용할 검수된 교재 근거를 찾지 못했습니다."}
        </p>
        {visibleActive ? (
          <span className="retrieval-progress" aria-hidden="true">
            <span />
          </span>
        ) : null}
      </div>
    </details>
  );
}

function EvidencePanel({ event }: { event: EvidenceEvent }) {
  const copy = evidenceLabels[event.status];
  const linkedSources = event.sourceIds
    .map((sourceId) => getSource(sourceId))
    .filter((source): source is Source => Boolean(source));

  return (
    <Card
      padding={3}
      variant={event.status === "SUPPORTED" ? "muted" : "default"}
      className={`evidence-panel evidence-${event.status.toLowerCase()}`}
      aria-label="최근 답변의 출처"
    >
      <div className="evidence-heading">
        <Badge variant={copy.variant} label={copy.label} />
        <span className="evidence-count">출처 {linkedSources.length}개</span>
      </div>
      <p>{copy.detail}</p>
      {linkedSources.length > 0 ? (
        <details className="evidence-sources">
          <summary>출처 {linkedSources.length}개 보기</summary>
          <ol>
            {linkedSources.map((source, index) => (
              <li key={source.id}>
                <Citation
                  source={{ title: source.title, url: source.url }}
                  number={index + 1}
                  variant="label"
                />
                <span>
                  {source.publisher} · 검토 {source.reviewedAt}
                </span>
              </li>
            ))}
          </ol>
        </details>
      ) : null}
    </Card>
  );
}

function SparkIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2.8c.7 5 2.2 6.5 7.2 7.2-5 .7-6.5 2.2-7.2 7.2-.7-5-2.2-6.5-7.2-7.2 5-.7 6.5-2.2 7.2-7.2Z" />
      <path d="M18.5 15.5c.3 2.1.9 2.7 3 3-2.1.3-2.7.9-3 3-.3-2.1-.9-2.7-3-3 2.1-.3 2.7-.9 3-3Z" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="10.5" cy="10.5" r="5.5" />
      <path d="m15 15 4.5 4.5" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="7" y="7" width="10" height="10" rx="2" />
    </svg>
  );
}

function ArrowDownIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 5v14M6 13l6 6 6-6" />
    </svg>
  );
}
