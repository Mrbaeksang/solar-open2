import { describe, expect, it } from "vitest";

import { loadAndValidateContent } from "../scripts/content-validator.mjs";

describe("published learning content", () => {
  it("contains seven independently authored chapters per track", async () => {
    const result = await loadAndValidateContent();

    expect(result.chapters).toHaveLength(14);
    expect(
      result.chapters.filter((chapter) => chapter.track === "easy"),
    ).toHaveLength(7);
    expect(
      result.chapters.filter((chapter) => chapter.track === "standard"),
    ).toHaveLength(7);

    for (const number of Array.from({ length: 7 }, (_, index) => index + 1)) {
      const pair = result.chapters.filter(
        (chapter) => chapter.number === number,
      );
      expect(pair).toHaveLength(2);
      expect(pair[0]?.quiz.question).not.toBe(pair[1]?.quiz.question);
      expect(pair[0]?.plainText).not.toBe(pair[1]?.plainText);
    }
  });

  it("rejects claims or sources without release metadata", async () => {
    const result = await loadAndValidateContent();

    expect(result.claims.length).toBeGreaterThan(20);
    for (const claim of result.claims) {
      expect(claim.sources.length).toBeGreaterThan(0);
      expect(claim.text.length).toBeGreaterThan(10);
    }
    for (const source of result.sources) {
      expect(source.publisher).toBeTruthy();
      expect(source.title).toBeTruthy();
      expect(source.editionOrVersion).toBeTruthy();
      expect(source.publishedAt).toMatch(/^\d{4}/);
      expect(source.license).toBeTruthy();
      expect(source.url).toMatch(/^https:\/\//);
      expect(source.reviewedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("emits only registry-backed source ids into the retrieval corpus", async () => {
    const result = await loadAndValidateContent();
    const sourceIds = new Set(result.sources.map((source) => source.id));

    for (const passage of result.corpus.passages) {
      expect(["easy", "standard", "common"]).toContain(passage.track);
      expect(passage.text.length).toBeGreaterThan(20);
      for (const sourceId of passage.sourceIds) {
        expect(sourceIds.has(sourceId)).toBe(true);
      }
    }
  });
});
