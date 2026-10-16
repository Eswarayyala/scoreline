import { test, expect } from "@playwright/test";
import { dummyCredentials, signUpDummy } from "./helpers/dummy.js";

test("create the dummy Playwright user on the live site", async ({ page }) => {
  const { name, email, password } = dummyCredentials();
  test.skip(!email || !password, "Set PLAYWRIGHT_DUMMY_EMAIL and PLAYWRIGHT_DUMMY_PASSWORD in .env");

  await page.goto("/");
  await signUpDummy(page, { name, email, password });
  await expect(page.getByRole("button", { name: /Sign in \/ join/i })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Tournaments", exact: true })).toBeVisible();
});
