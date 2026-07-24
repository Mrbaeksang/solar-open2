import { expect, test } from "@playwright/test";

test("reader chooses a track, reads evidence, and answers a check question", async ({
  page,
}) => {
  await page.goto("/");
  await Promise.all([
    page.waitForURL(/\/learn\/easy\/ai-is$/, { timeout: 15_000 }),
    page.getByRole("link", { name: /쉬운 트랙 시작/ }).first().click(),
  ]);

  await expect(
    page.getByRole("heading", { name: "AI란 무엇인가" }),
  ).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: /출처 1 열기/ }).first().click();
  const sourceDialog = page.getByRole("dialog", { name: /출처 자세히 보기/ });
  await expect(sourceDialog).toBeVisible();
  await expect(sourceDialog.getByText(/OECD/).first()).toBeVisible();
  await page.getByRole("button", { name: "출처 닫기" }).click();

  const quiz = page.getByRole("region", { name: "확인 문제", exact: true });
  await quiz.getByRole("radio").first().check();
  await page.getByRole("button", { name: "정답 확인" }).click();
  await expect(quiz.getByRole("status")).toBeVisible();
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

  await expect(page.getByText("교재 근거로 답함")).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.locator(".astryx-chat-composer")).toBeVisible();
  await expect(page.locator(".astryx-chat-message-list")).toHaveAttribute(
    "aria-live",
    "polite",
  );
  await expect(page.locator(".astryx-chat-message")).toHaveCount(2);
  await expect(page.getByText("함께 보는 곳")).toBeVisible();
  await expect(page.locator(".evidence-panel a").first()).toHaveAttribute(
    "href",
    /^https:\/\//,
  );
});

test("mobile exposes navigation and assistant as touch-sized controls", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile");
  await page.goto("/learn/standard/ai-is");

  const assistantButton = page.getByRole("button", { name: "교재 도우미" });
  const box = await assistantButton.boundingBox();
  expect(box?.width).toBeGreaterThanOrEqual(44);
  expect(box?.height).toBeGreaterThanOrEqual(44);

  await assistantButton.click();
  await expect(
    page.getByRole("complementary", { name: "기본 트랙 AI 교재 도우미" }),
  ).toBeVisible();
});

test("assistant never steals focus from the textbook", async ({ page }) => {
  await page.goto("/learn/easy/ai-is");

  await expect(page.locator(".assistant-drawer")).toHaveCount(0);
  await page.getByRole("button", { name: "교재 도우미" }).click();

  const input = page.getByRole("textbox", {
    name: "AI 교재 도우미에게 질문",
  });
  await expect(input).toBeVisible();
  await expect(input).not.toBeFocused();
  expect(await input.getAttribute("autofocus")).toBeNull();
});

test("Pretendard is the product and component font", async ({ page }) => {
  await page.goto("/");
  const families = await page.evaluate(() => ({
    body: getComputedStyle(document.body).fontFamily,
    heading: getComputedStyle(document.querySelector("h1")!).fontFamily,
  }));

  expect(families.body).toContain("Pretendard");
  expect(families.heading).toContain("Pretendard");
});
