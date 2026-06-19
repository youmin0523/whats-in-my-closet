import { expect, test, type Page } from "@playwright/test";

async function devLogin(page: Page) {
  await page.goto("/login");
  await page.getByRole("button", { name: "개발 로그인으로 둘러보기" }).click();
  await expect(page).toHaveURL(/\/closet$/);
}

test("settings page shows the plan catalog (works without keys)", async ({
  page,
}) => {
  await devLogin(page);
  await page.goto("/settings");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("요금제");
  // Plan catalog is public — renders even before DB/PG keys.
  await expect(page.getByText("프리미엄 플러스")).toBeVisible();
  await expect(page.getByText("9,900원")).toBeVisible();
});

test("nav links to settings", async ({ page }) => {
  await devLogin(page);
  await page.getByRole("link", { name: "설정" }).click();
  await expect(page).toHaveURL(/\/settings$/);
});
