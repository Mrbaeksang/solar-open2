import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

for (const path of ["/", "/learn/easy/ai-is", "/sources"]) {
  test(`has no automatically detectable WCAG A/AA violations: ${path}`, async ({
    page,
  }) => {
    await page.goto(path);
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();

    expect(
      result.violations,
      result.violations
        .map(
          (violation) =>
            `${violation.id}: ${violation.help} (${violation.nodes.length})`,
        )
        .join("\n"),
    ).toEqual([]);
  });
}

test("desktop assistant keeps text contrast while opening", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "desktop drawer transition");

  await page.goto("/learn/easy/ai-is");
  const drawer = page.locator(".assistant-drawer");
  await expect(drawer).toHaveClass(/is-open/);
  await drawer.evaluate(async (element) => {
    element.classList.remove("is-open");
    await Promise.all(
      element
        .getAnimations()
        .map((animation) => animation.finished.catch(() => undefined)),
    );

    element.classList.add("is-open");
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
    for (const animation of element.getAnimations()) {
      const duration = Number(animation.effect?.getComputedTiming().duration);
      animation.pause();
      animation.currentTime = Number.isFinite(duration) ? duration / 10 : 0;
    }
  });

  const result = await new AxeBuilder({ page })
    .include(".assistant-drawer")
    .withRules(["color-contrast"])
    .analyze();
  expect(result.violations).toEqual([]);
});
