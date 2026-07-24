import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const defaultContentRoot = path.resolve(scriptDirectory, "../content");
const requiredSourceFields = [
  "id",
  "publisher",
  "title",
  "editionOrVersion",
  "publishedAt",
  "summary",
  "license",
  "licenseUrl",
  "url",
  "reviewedAt",
  "kind",
  "usage",
];
const allowedTracks = new Set(["easy", "standard"]);
const allowedSourceKinds = new Set([
  "independent-public",
  "education-consortium",
  "primary-research",
  "vendor-primary",
]);

function invariant(condition, message) {
  if (!condition) {
    throw new Error(`Content validation failed: ${message}`);
  }
}

async function readJSON(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function stripMDX(value) {
  return value
    .replace(/<Cite\s+claim="[^"]+"\s*\/>/g, "")
    .replace(/<\/?[A-Z][^>]*>/g, " ")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[*_`>#]/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function extractSections(mdx, chapter) {
  const matches = [
    ...mdx.matchAll(
      /<LessonSection\s+id="([^"]+)"\s+title="([^"]+)">([\s\S]*?)<\/LessonSection>/g,
    ),
  ];
  invariant(
    matches.length === chapter.sections.length,
    `${chapter.track}/${chapter.slug} has ${matches.length} rendered sections; catalog declares ${chapter.sections.length}`,
  );

  return matches.map((match, index) => {
    const [, id, title, body] = match;
    const declared = chapter.sections[index];
    invariant(
      declared?.id === id && declared?.title === title,
      `${chapter.track}/${chapter.slug} section ${index + 1} differs from catalog`,
    );
    return {
      id,
      title,
      body,
      plainText: stripMDX(body),
      claimIds: [
        ...body.matchAll(/<Cite\s+claim="([^"]+)"\s*\/>/g),
      ].map((citation) => citation[1]),
    };
  });
}

export async function loadAndValidateContent(options = {}) {
  const contentRoot = options.contentRoot ?? defaultContentRoot;

  const [catalogDocument, sourceDocument, claimDocument] = await Promise.all([
    readJSON(path.join(contentRoot, "catalog.json")),
    readJSON(path.join(contentRoot, "sources.json")),
    readJSON(path.join(contentRoot, "claims.json")),
  ]);

  const chapters = catalogDocument.chapters;
  const sources = sourceDocument.sources;
  const claims = claimDocument.claims;

  invariant(catalogDocument.schemaVersion === 1, "catalog schemaVersion must be 1");
  invariant(sourceDocument.schemaVersion === 1, "source schemaVersion must be 1");
  invariant(claimDocument.schemaVersion === 1, "claim schemaVersion must be 1");
  invariant(Array.isArray(chapters), "catalog chapters must be an array");
  invariant(Array.isArray(sources), "sources must be an array");
  invariant(Array.isArray(claims), "claims must be an array");

  const sourceById = new Map();
  for (const source of sources) {
    for (const field of requiredSourceFields) {
      invariant(
        typeof source[field] === "string" && source[field].trim().length > 0,
        `source ${source.id ?? "(missing id)"} is missing ${field}`,
      );
    }
    invariant(!sourceById.has(source.id), `duplicate source id ${source.id}`);
    invariant(
      /^https:\/\//.test(source.url) && /^https:\/\//.test(source.licenseUrl),
      `source ${source.id} must use HTTPS URLs`,
    );
    invariant(
      /^\d{4}-\d{2}-\d{2}$/.test(source.reviewedAt),
      `source ${source.id} reviewedAt must be YYYY-MM-DD`,
    );
    invariant(
      allowedSourceKinds.has(source.kind),
      `source ${source.id} has unsupported kind ${source.kind}`,
    );
    sourceById.set(source.id, source);
  }

  const chapterByKey = new Map();
  const counts = { easy: 0, standard: 0 };
  for (const chapter of chapters) {
    invariant(allowedTracks.has(chapter.track), `invalid track ${chapter.track}`);
    invariant(
      Number.isInteger(chapter.number) &&
        chapter.number >= 1 &&
        chapter.number <= 7,
      `${chapter.track}/${chapter.slug} has invalid number`,
    );
    const key = `${chapter.track}:${chapter.slug}`;
    invariant(!chapterByKey.has(key), `duplicate chapter ${key}`);
    invariant(
      chapter.quiz?.options?.length >= 3 &&
        chapter.quiz.correctIndex >= 0 &&
        chapter.quiz.correctIndex < chapter.quiz.options.length,
      `${key} has an invalid quiz`,
    );
    invariant(
      Array.isArray(chapter.review?.history) &&
        chapter.review.history.length > 0,
      `${key} has no editorial review history`,
    );
    for (const sourceId of chapter.sourceIds) {
      invariant(
        sourceById.has(sourceId),
        `${key} references unknown source ${sourceId}`,
      );
    }
    chapterByKey.set(key, chapter);
    counts[chapter.track] += 1;
  }
  invariant(counts.easy === 7, "easy track must have seven chapters");
  invariant(counts.standard === 7, "standard track must have seven chapters");
  for (let number = 1; number <= 7; number += 1) {
    const pair = chapters.filter((chapter) => chapter.number === number);
    invariant(pair.length === 2, `chapter ${number} must have one item per track`);
    invariant(
      pair[0].quiz.question !== pair[1].quiz.question,
      `chapter ${number} track quizzes must be independently authored`,
    );
  }

  const claimById = new Map();
  for (const claim of claims) {
    invariant(!claimById.has(claim.id), `duplicate claim id ${claim.id}`);
    const chapterKey = `${claim.track}:${claim.chapterSlug}`;
    const chapter = chapterByKey.get(chapterKey);
    invariant(chapter, `claim ${claim.id} points to unknown chapter ${chapterKey}`);
    invariant(
      typeof claim.text === "string" && claim.text.trim().length > 10,
      `claim ${claim.id} has no reviewable statement`,
    );
    invariant(
      Array.isArray(claim.sources) && claim.sources.length > 0,
      `claim ${claim.id} has no source links`,
    );
    for (const link of claim.sources) {
      invariant(sourceById.has(link.id), `claim ${claim.id} uses unknown source ${link.id}`);
      invariant(
        chapter.sourceIds.includes(link.id),
        `claim ${claim.id} source ${link.id} is absent from the chapter bibliography`,
      );
      invariant(
        typeof link.locator === "string" && link.locator.trim().length > 5,
        `claim ${claim.id} source ${link.id} has no exact locator`,
      );
    }
    claimById.set(claim.id, claim);
  }

  const usedClaims = new Map();
  const hydratedChapters = [];
  const passages = [];
  for (const chapter of chapters) {
    const filePath = path.join(contentRoot, chapter.file);
    const mdx = await readFile(filePath, "utf8");
    const sections = extractSections(mdx, chapter);
    const plainText = stripMDX(mdx);
    invariant(
      plainText.length >= 900,
      `${chapter.track}/${chapter.slug} is too short for a complete chapter (${plainText.length} chars)`,
    );

    for (const section of sections) {
      invariant(
        section.plainText.length >= 180,
        `${chapter.track}/${chapter.slug}#${section.id} is too short`,
      );
      const sectionSourceIds = new Set();
      for (const claimId of section.claimIds) {
        const claim = claimById.get(claimId);
        invariant(
          claim,
          `${chapter.track}/${chapter.slug} cites unknown claim ${claimId}`,
        );
        invariant(
          claim.track === chapter.track && claim.chapterSlug === chapter.slug,
          `${claimId} is cited from the wrong chapter`,
        );
        usedClaims.set(claimId, (usedClaims.get(claimId) ?? 0) + 1);
        for (const link of claim.sources) {
          sectionSourceIds.add(link.id);
        }
      }
      invariant(
        section.claimIds.length > 0,
        `${chapter.track}/${chapter.slug}#${section.id} has no claim-level citation`,
      );
      passages.push({
        id: `${chapter.track}:${chapter.slug}:${section.id}`,
        track: chapter.track,
        chapterId: chapter.slug,
        chapterTitle: chapter.title,
        sectionId: section.id,
        sectionTitle: section.title,
        text: section.plainText,
        sourceIds: [...sectionSourceIds],
        claimIds: section.claimIds,
      });
    }

    hydratedChapters.push({
      ...chapter,
      plainText,
      sections: sections.map(({ body: _body, ...section }) => section),
    });
  }

  for (const claim of claims) {
    invariant(
      usedClaims.get(claim.id) === 1,
      `claim ${claim.id} must be cited exactly once; found ${usedClaims.get(claim.id) ?? 0}`,
    );
  }

  for (const source of sources) {
    passages.push({
      id: `common:source:${source.id}`,
      track: "common",
      chapterId: "sources",
      chapterTitle: "검증된 출처",
      sectionId: source.id,
      sectionTitle: source.title,
      text: `${source.publisher}. ${source.title}. ${source.summary} 이용 범위: ${source.usage}`,
      sourceIds: [source.id],
      claimIds: [],
    });
  }

  return {
    schemaVersion: 1,
    tracks: catalogDocument.tracks,
    chapters: hydratedChapters,
    sources,
    claims,
    corpus: {
      schemaVersion: 1,
      sources,
      passages,
    },
  };
}
