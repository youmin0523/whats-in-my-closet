import path from "node:path";
import { expect, test } from "@playwright/test";

const sampleImage = path.join(process.cwd(), "e2e", "fixtures", "sample.png");

test("dev login → closet → upload (works without any keys)", async ({
  page,
}) => {
  // Sign in via the dev-login fallback (no OAuth keys required).
  await page.goto("/login");
  await page
    .getByRole("button", { name: "개발 로그인으로 둘러보기" })
    .click();

  await expect(page).toHaveURL(/\/closet$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("님");

  // Upload an image via the local-disk fallback (no Cloudinary keys required).
  await page.goto("/closet/add");
  await page.setInputFiles('input[type="file"]', sampleImage);
  await page.getByRole("button", { name: "추가", exact: true }).click();

  await expect(
    page.getByText(/업로드 완료|옷장에 추가했어요/),
  ).toBeVisible({ timeout: 20_000 });
});
