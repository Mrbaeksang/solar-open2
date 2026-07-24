import type { ComponentType } from "react";

import Easy01 from "../../content/easy/01-ai-is.mdx";
import Easy02 from "../../content/easy/02-learning-from-data.mdx";
import Easy03 from "../../content/easy/03-choosing-an-answer.mdx";
import Easy04 from "../../content/easy/04-generative-ai.mdx";
import Easy05 from "../../content/easy/05-verify-errors.mdx";
import Easy06 from "../../content/easy/06-rag-and-sources.mdx";
import Easy07 from "../../content/easy/07-responsible-use.mdx";
import Standard01 from "../../content/standard/01-ai-is.mdx";
import Standard02 from "../../content/standard/02-learning-from-data.mdx";
import Standard03 from "../../content/standard/03-choosing-an-answer.mdx";
import Standard04 from "../../content/standard/04-generative-ai.mdx";
import Standard05 from "../../content/standard/05-verify-errors.mdx";
import Standard06 from "../../content/standard/06-rag-and-sources.mdx";
import Standard07 from "../../content/standard/07-responsible-use.mdx";

const contentModules: Record<string, ComponentType> = {
  "easy:ai-is": Easy01,
  "easy:learning-from-data": Easy02,
  "easy:choosing-an-answer": Easy03,
  "easy:generative-ai": Easy04,
  "easy:verify-errors": Easy05,
  "easy:rag-and-sources": Easy06,
  "easy:responsible-use": Easy07,
  "standard:ai-is": Standard01,
  "standard:learning-from-data": Standard02,
  "standard:choosing-an-answer": Standard03,
  "standard:generative-ai": Standard04,
  "standard:verify-errors": Standard05,
  "standard:rag-and-sources": Standard06,
  "standard:responsible-use": Standard07,
};

export function getChapterContent(track: string, chapter: string) {
  return contentModules[`${track}:${chapter}`];
}
