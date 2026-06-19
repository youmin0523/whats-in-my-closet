import { expect, test, type Page } from "@playwright/test";

async function devLogin(page: Page) {
  await page.goto("/login");
  await page.getByRole("button", { name: "개발 로그인으로 둘러보기" }).click();
  await expect(page).toHaveURL(/\/closet$/);
}

test("closet color filter chip navigates with ?color=", async ({ page }) => {
  await devLogin(page);
  // Color chips are static — they render even before a DB is connected.
  const navy = page.getByRole("link", { name: "네이비" });
  await expect(navy).toBeVisible();
  await navy.click();
  await expect(page).toHaveURL(/color=navy/);
  // With a filter active and no items, the closet shows the filtered-empty copy.
  await expect(page.getByText("조건에 맞는 옷이 없어요.")).toBeVisible();
});

test("wishlist page renders (works without keys)", async ({ page }) => {
  await devLogin(page);
  await page.goto("/wishlist");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "위시리스트",
  );
});
