import { expect, test } from "@playwright/test";

test("reader chooses a track, reads evidence, and answers a check question", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("link", { name: /쉬운 트랙 시작/ }).first().click();

  await expect(
    page.getByRole("heading", { name: "AI란 무엇인가" }),
  ).toBeVisible();
  await page.getByRole("button", { name: /출처 1 열기/ }).first().click();
  const sourceDialog = page.getByRole("dialog", { name: /출처 자세히 보기/ });
  await expect(sourceDialog).toBeVisible();
  await expect(sourceDialog.getByText(/OECD/).first()).toBeVisible();
  await page.getByRole("button", { name: "출처 닫기" }).click();

  const quiz = page.getByRole("group", { name: "확인 문제" });
  await quiz.getByRole("radio").first().check();
  await page.getByRole("button", { name: "정답 확인" }).click();
  await expect(page.getByRole("status")).toBeVisible();
});

test("assistant receives selected reading context through the Go AG-UI endpoint", async ({
  page,
}) => {
  await page.goto("/learn/easy/ai-is");

  const sectionText = page
    .getByText(/AI 시스템은 사람이 정한 목표를 위해/)
    .first();
  await sectionText.selectText();
  await page.getByRole("button", { name: "이 부분 질문" }).click();

  await expect(page.getByText("교재 근거 있음")).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByText(/지금 읽는 부분/)).toBeVisible();
  await expect(page.getByRole("link", { name: /출처 원문/ }).first()).toHaveAttribute(
    "href",
    /^https:\/\//,
  );
});

test("mobile exposes navigation and assistant as touch-sized controls", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile");
  await page.goto("/learn/standard/ai-is");

  const assistantButton = page.getByRole("button", { name: "AI 도우미 열기" });
  const box = await assistantButton.boundingBox();
  expect(box?.width).toBeGreaterThanOrEqual(44);
  expect(box?.height).toBeGreaterThanOrEqual(44);

  await assistantButton.click();
  await expect(page.getByRole("dialog", { name: "기본 트랙 AI 도우미" })).toBeVisible();
});
