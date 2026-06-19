import { expect, test, type Page } from "@playwright/test";

async function devLogin(page: Page) {
  await page.goto("/login");
  await page.getByRole("button", { name: "개발 로그인으로 둘러보기" }).click();
  await expect(page).toHaveURL(/\/closet$/);
}

test("2D location map renders with an unassigned tray", async ({ page }) => {
  await devLogin(page);
  await page.goto("/locations/map");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "끌어다 위치 정하기",
  );
  // The drop-target tray for not-yet-placed garments is always present.
  await expect(page.getByText("미분류")).toBeVisible();
});

test("locations page links to the 2D map", async ({ page }) => {
  await devLogin(page);
  await page.goto("/locations");
  const mapLink = page.getByRole("link", { name: "2D 배치도" });
  await expect(mapLink).toBeVisible();
  await mapLink.click();
  await expect(page).toHaveURL(/\/locations\/map$/);
});
