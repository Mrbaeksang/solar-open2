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
