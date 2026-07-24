import sourceDocument from "../../content/sources.json";

export type LearningTrack = "easy" | "standard";

export interface ReadingContext {
  track: LearningTrack;
  chapterId: string;
  sectionId: string;
  selection?: string;
  visibleContext?: string;
  sourceIds: string[];
}

const allowedSourceIds = new Set(
  sourceDocument.sources.map((source) => source.id),
);
const safeIdentifier = /^[a-z0-9][a-z0-9-]{0,63}$/;

function boundedText(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return undefined;
  }
  const sanitized = value
    .replace(/<[^>]*>/g, " ")
    .replace(
      /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
      "[개인정보 제거]",
    )
    .replace(/\b01[016789][-\s]?\d{3,4}[-\s]?\d{4}\b/g, "[개인정보 제거]")
    .replace(/\s+/g, " ")
    .trim();
  return sanitized ? [...sanitized].slice(0, maxLength).join("") : undefined;
}

export function sanitizeReadingContext(
  input: Record<string, unknown>,
): ReadingContext {
  if (input.track !== "easy" && input.track !== "standard") {
    throw new Error("지원하지 않는 학습 트랙입니다.");
  }
  if (
    typeof input.chapterId !== "string" ||
    !safeIdentifier.test(input.chapterId) ||
    typeof input.sectionId !== "string" ||
    !safeIdentifier.test(input.sectionId)
  ) {
    throw new Error("읽기 위치가 올바르지 않습니다.");
  }

  const selection = boundedText(input.selection, 500);
  const visibleContext = boundedText(input.visibleContext, 800);
  const sourceIds = Array.isArray(input.sourceIds)
    ? [
        ...new Set(
          input.sourceIds.filter(
            (sourceId): sourceId is string =>
              typeof sourceId === "string" && allowedSourceIds.has(sourceId),
          ),
        ),
      ].slice(0, 12)
    : [];

  return {
    track: input.track,
    chapterId: input.chapterId,
    sectionId: input.sectionId,
    ...(selection ? { selection } : {}),
    ...(visibleContext ? { visibleContext } : {}),
    sourceIds,
  };
}
