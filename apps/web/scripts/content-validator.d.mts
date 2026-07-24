export interface ContentSource {
  id: string;
  publisher: string;
  title: string;
  editionOrVersion: string;
  publishedAt: string;
  summary: string;
  license: string;
  licenseUrl: string;
  url: string;
  reviewedAt: string;
  kind: string;
  usage: string;
}

export interface ContentClaim {
  id: string;
  track: "easy" | "standard";
  chapterSlug: string;
  text: string;
  sources: Array<{ id: string; locator: string }>;
}

export interface ContentBuild {
  schemaVersion: 1;
  tracks: Record<string, unknown>;
  chapters: Array<{
    track: "easy" | "standard";
    number: number;
    slug: string;
    plainText: string;
    quiz: { question: string; options: string[]; correctIndex: number };
  }>;
  sources: ContentSource[];
  claims: ContentClaim[];
  corpus: {
    schemaVersion: 1;
    sources: ContentSource[];
    passages: Array<{
      id: string;
      track: "easy" | "standard" | "common";
      text: string;
      sourceIds: string[];
    }>;
  };
}

export function loadAndValidateContent(options?: {
  contentRoot?: string;
}): Promise<ContentBuild>;
