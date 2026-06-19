import { expect, test } from "@playwright/test";

test("landing renders the brand and value proposition", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "충동구매가 멈춥니다",
  );
  await expect(page.getByText("옷장 지킴이").first()).toBeVisible();
  await expect(
    page.getByRole("link", { name: "내 옷장 만들기" }),
  ).toBeVisible();
});

test("landing visual golden", async ({ page }) => {
  await page.goto("/");
  // Wait for the self-hosted Pretendard font to settle before snapshotting.
  await page.evaluate(() => document.fonts.ready);
  await expect(page).toHaveScreenshot("landing.png", { fullPage: true });
});
