import catalogDocument from "../../content/catalog.json";
import claimDocument from "../../content/claims.json";
import sourceDocument from "../../content/sources.json";
import generatedContent from "../generated/content.json";

import type { LearningTrack } from "./reading-context";

export type SourceKind =
  | "independent-public"
  | "education-consortium"
  | "primary-research"
  | "vendor-primary";

export interface Source {
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
  kind: SourceKind;
  usage: string;
}

export interface ClaimSourceLink {
  id: string;
  locator: string;
}

export interface Claim {
  id: string;
  track: LearningTrack;
  chapterSlug: string;
  text: string;
  sources: ClaimSourceLink[];
}

export interface Quiz {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface Chapter {
  track: LearningTrack;
  number: number;
  slug: string;
  file: string;
  title: string;
  eyebrow: string;
  description: string;
  objectives: string[];
  sections: Array<{ id: string; title: string }>;
  sourceIds: string[];
  quiz: Quiz;
  review: {
    status: string;
    issue: number;
    history: Array<{ date: string; reviewer: string; decision: string }>;
  };
}

export interface Track {
  label: string;
  audience: string;
  assistantName: string;
  assistantDescription: string;
}

export const tracks = catalogDocument.tracks as Record<LearningTrack, Track>;
export const chapters = catalogDocument.chapters as Chapter[];
export const sources = sourceDocument.sources as Source[];
export const claims = claimDocument.claims as Claim[];

const sourceById = new Map(sources.map((source) => [source.id, source]));
const claimById = new Map(claims.map((claim) => [claim.id, claim]));

export function isLearningTrack(value: string): value is LearningTrack {
  return value === "easy" || value === "standard";
}

export function getTrack(track: LearningTrack) {
  return tracks[track];
}

export function getChapters(track: LearningTrack) {
  return chapters
    .filter((chapter) => chapter.track === track)
    .sort((left, right) => left.number - right.number);
}

export function getChapter(track: LearningTrack, slug: string) {
  return chapters.find(
    (chapter) => chapter.track === track && chapter.slug === slug,
  );
}

export function getSource(sourceId: string) {
  return sourceById.get(sourceId);
}

export function getSourceDisplayName(source: Source) {
  const publisher = source.publisher;
  if (publisher.includes("OECD")) return "OECD";
  if (publisher.includes("UNESCO")) return "UNESCO";
  if (publisher.includes("UNICEF")) return "UNICEF";
  if (publisher.includes("National Institute of Standards")) return "NIST";
  if (publisher.includes("AI4K12")) return "AI4K12";
  if (publisher.includes("NeurIPS")) return "NeurIPS";
  if (publisher.includes("Upstage")) return "Upstage";
  return publisher.split("·")[0]?.trim() || "출처";
}

export function getClaim(claimId: string) {
  return claimById.get(claimId);
}

export function getChapterClaims(track: LearningTrack, chapterSlug: string) {
  return claims.filter(
    (claim) => claim.track === track && claim.chapterSlug === chapterSlug,
  );
}

export function getClaimNumber(claim: Claim) {
  return (
    getChapterClaims(claim.track, claim.chapterSlug).findIndex(
      (candidate) => candidate.id === claim.id,
    ) + 1
  );
}

export function getChapterSources(chapter: Chapter) {
  return chapter.sourceIds
    .map((sourceId) => sourceById.get(sourceId))
    .filter((source): source is Source => Boolean(source));
}

export function getChapterNeighbors(chapter: Chapter) {
  const trackChapters = getChapters(chapter.track);
  const index = trackChapters.findIndex(
    (candidate) => candidate.slug === chapter.slug,
  );
  return {
    previous: index > 0 ? trackChapters[index - 1] : undefined,
    next:
      index >= 0 && index < trackChapters.length - 1
        ? trackChapters[index + 1]
        : undefined,
  };
}

export function getSectionContexts(
  track: LearningTrack,
  chapterSlug: string,
) {
  const generatedChapter = generatedContent.chapters.find(
    (chapter) =>
      chapter.track === track && chapter.slug === chapterSlug,
  );
  if (!generatedChapter) {
    return {};
  }
  return Object.fromEntries(
    generatedChapter.sections.map((section) => [
      section.id,
      {
        title: section.title,
        sourceIds: [
          ...new Set(
            section.claimIds.flatMap(
              (claimId) =>
                getClaim(claimId)?.sources.map((link) => link.id) ?? [],
            ),
          ),
        ],
      },
    ]),
  );
}
