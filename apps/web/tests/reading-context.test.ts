import { describe, expect, it } from "vitest";

import { sanitizeReadingContext } from "@/lib/reading-context";

describe("reading context contract", () => {
  it("keeps only bounded semantic context", () => {
    const context = sanitizeReadingContext({
      track: "easy",
      chapterId: "ai-is",
      sectionId: "meaning",
      selection: "가".repeat(900),
      visibleContext: "나".repeat(2_000),
      sourceIds: ["oecd-ailit-2026", "unknown"],
      rawDom: "<main>must never leave browser</main>",
      email: "reader@example.com",
    });

    expect(context).toEqual({
      track: "easy",
      chapterId: "ai-is",
      sectionId: "meaning",
      selection: "가".repeat(500),
      visibleContext: "나".repeat(800),
      sourceIds: ["oecd-ailit-2026"],
    });
    expect(JSON.stringify(context)).not.toContain("rawDom");
    expect(JSON.stringify(context)).not.toContain("reader@example.com");
  });

  it("rejects unknown tracks and chapter identifiers", () => {
    expect(() =>
      sanitizeReadingContext({
        track: "other",
        chapterId: "<script>",
        sectionId: "meaning",
      }),
    ).toThrow();
  });
});
