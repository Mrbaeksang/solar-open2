import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadAndValidateContent } from "./content-validator.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(scriptDirectory, "..");
const result = await loadAndValidateContent();
const webOutput = path.join(webRoot, "src/generated/content.json");
const apiOutput = path.resolve(
  webRoot,
  "../api/internal/content/corpus.json",
);

await Promise.all([
  mkdir(path.dirname(webOutput), { recursive: true }),
  mkdir(path.dirname(apiOutput), { recursive: true }),
]);
await Promise.all([
  writeFile(webOutput, `${JSON.stringify(result, null, 2)}\n`),
  writeFile(apiOutput, `${JSON.stringify(result.corpus, null, 2)}\n`),
]);

console.log(
  `content ok: ${result.chapters.length} chapters, ${result.claims.length} claims, ${result.sources.length} sources, ${result.corpus.passages.length} passages`,
);
