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

test("public reading surfaces fit a 320px mobile viewport", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile");
  await page.setViewportSize({ width: 320, height: 568 });

  for (const path of [
    "/",
    "/learn/easy/ai-is",
    "/learn/standard/responsible-use",
    "/sources",
  ]) {
    await page.goto(path);
    const dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(dimensions.scrollWidth, path).toBeLessThanOrEqual(
      dimensions.clientWidth,
    );
  }
});

test("mobile assistant keeps the conversation chrome readable and inside the sheet", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile");
  await page.setViewportSize({ width: 360, height: 640 });
  await page.goto("/learn/standard/ai-is");
  await page.getByRole("button", { name: "교재 도우미" }).click();
  await page.getByRole("button", { name: "핵심 주장" }).click();
  await expect(page.getByText("교재 근거로 답함")).toBeVisible({
    timeout: 15_000,
  });

  const drawer = page.locator(".assistant-drawer");
  const composer = page.getByRole("textbox", {
    name: "AI 교재 도우미에게 질문",
  });
  const privacy = page.locator(".assistant-privacy");
  await expect(drawer).toBeVisible();
  await expect(composer).toBeInViewport();
  await expect(privacy).toBeInViewport();
  const sourceDisclosure = drawer.locator(".evidence-sources");
  await expect(sourceDisclosure.locator("summary")).toContainText(
    /출처 \d+개 보기/,
  );
  await expect(sourceDisclosure.locator("ol")).toBeHidden();

  const layout = await drawer.evaluate((element) => {
    const drawerRect = element.getBoundingClientRect();
    const viewport = element.querySelector(".assistant-viewport");
    const messageList = element.querySelector(".assistant-message-list");
    const evidence = element.querySelector(".evidence-panel");
    const composerShell = element.querySelector(".assistant-composer-shell");
    const overflowing = [...element.querySelectorAll<HTMLElement>("*")]
      .filter((child) => {
        const style = getComputedStyle(child);
        if (style.position === "fixed" || style.visibility === "hidden") {
          return false;
        }
        const rect = child.getBoundingClientRect();
        return (
          rect.width > 0 &&
          (rect.left < drawerRect.left - 1 || rect.right > drawerRect.right + 1)
        );
      })
      .map((child) => child.className || child.tagName);

    return {
      drawer: {
        top: drawerRect.top,
        right: drawerRect.right,
        bottom: drawerRect.bottom,
        height: drawerRect.height,
      },
      viewport:
        viewport instanceof HTMLElement
          ? {
              clientHeight: viewport.clientHeight,
              scrollHeight: viewport.scrollHeight,
            }
          : null,
      messageList:
        messageList instanceof HTMLElement
          ? {
              clientHeight: messageList.clientHeight,
              scrollHeight: messageList.scrollHeight,
              bottom: messageList.getBoundingClientRect().bottom,
            }
          : null,
      evidenceTop: evidence?.getBoundingClientRect().top ?? null,
      composerHeight: composerShell?.getBoundingClientRect().height ?? null,
      overflowing,
    };
  });

  expect(layout.drawer.top).toBeGreaterThanOrEqual(0);
  expect(layout.drawer.right).toBeLessThanOrEqual(360);
  expect(layout.drawer.bottom).toBeLessThanOrEqual(640);
  expect(layout.drawer.height).toBeGreaterThanOrEqual(576);
  expect(layout.overflowing).toEqual([]);
  expect(layout.messageList).not.toBeNull();
  expect(layout.messageList!.clientHeight).toBeGreaterThanOrEqual(
    layout.messageList!.scrollHeight,
  );
  expect(layout.evidenceTop).toBeGreaterThanOrEqual(
    layout.messageList!.bottom,
  );
  expect(layout.composerHeight).not.toBeNull();
  expect(layout.composerHeight!).toBeLessThanOrEqual(76);

  const userBubble = page.locator(".chat-message-user .chat-message-body");
  const userTextColors = await userBubble
    .locator(".chat-speaker, p")
    .evaluateAll((elements) =>
      elements.map((element) => ({
        background: getComputedStyle(
          element.closest(".chat-message-body") ?? element,
        ).backgroundColor,
        foreground: getComputedStyle(element).color,
      })),
    );
  expect(userTextColors.length).toBeGreaterThan(0);
  expect(
    userTextColors.every(
      ({ foreground }) => foreground === "rgb(255, 255, 255)",
    ),
  ).toBe(true);
  await sourceDisclosure.locator("summary").click();
  const firstSource = sourceDisclosure.locator("a").first();
  await expect(firstSource).toBeVisible();
  await expect(drawer.locator(".assistant-scroll-bottom")).toBeHidden();
  const firstSourceBox = await firstSource.boundingBox();
  expect(firstSourceBox).not.toBeNull();
  expect(firstSourceBox!.height).toBeGreaterThanOrEqual(44);
  const evidenceWidths = await sourceDisclosure.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }));
  expect(evidenceWidths.scrollWidth).toBeLessThanOrEqual(
    evidenceWidths.clientWidth,
  );
  await sourceDisclosure.locator("summary").click();
  await page.setViewportSize({ width: 360, height: 360 });
  await expect(composer).toBeInViewport();
  await expect(privacy).toBeInViewport();
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
