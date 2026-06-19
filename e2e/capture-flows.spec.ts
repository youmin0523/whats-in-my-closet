import { expect, test, type Page } from "@playwright/test";

async function devLogin(page: Page) {
  await page.goto("/login");
  await page.getByRole("button", { name: "개발 로그인으로 둘러보기" }).click();
  await expect(page).toHaveURL(/\/closet$/);
}

test("tag-scan registration page renders (works without keys)", async ({
  page,
}) => {
  await devLogin(page);
  await page.goto("/closet/scan-tag");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "택 찍어서 등록",
  );
});

test("multi-item capture page renders (works without keys)", async ({
  page,
}) => {
  await devLogin(page);
  await page.goto("/closet/capture");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "여러 벌 한번에 등록",
  );
  await expect(page.locator('input[type="file"]').first()).toBeVisible();
});
