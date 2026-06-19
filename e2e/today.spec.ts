import { expect, test } from "@playwright/test";

test("today shows location-based weather (works without keys)", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "개발 로그인으로 둘러보기" }).click();
  await expect(page).toHaveURL(/\/closet$/);

  await page.goto("/today");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("뭐 입지");
  // KMA fallback (no key) renders example data + the temperature strip.
  await expect(page.getByText("예시 데이터")).toBeVisible();
  await expect(page.getByText(/18°/).first()).toBeVisible();
});
