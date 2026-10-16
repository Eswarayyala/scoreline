import { test, expect } from "@playwright/test";
import { browseAsGuest, dummyCredentials, dismissProfilePrompt, openCreateTournament, signInDummy } from "./helpers/dummy.js";

test.describe.configure({ mode: "serial" });

test("dummy guest can open live Home, Vault, and Tournaments", async ({ page }) => {
  await page.goto("/");
  await browseAsGuest(page);

  await expect(page.getByRole("button", { name: "Home", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "The Vault" }).click();
  await expect(page).toHaveURL(/\/vault/);

  await page.getByRole("button", { name: "Home", exact: true }).click();
  await page.getByRole("button", { name: /Live desk/ }).click();
  await expect(page).toHaveURL(/\/tournaments/);
  await expect(page.getByRole("button", { name: "+ New tournament" })).toHaveCount(0);
});

test("dummy signed-in user can open the create-tournament form", async ({ page }) => {
  const { email, password } = dummyCredentials();
  test.skip(!email || !password, "Set PLAYWRIGHT_DUMMY_EMAIL and PLAYWRIGHT_DUMMY_PASSWORD in .env");

  await page.goto("/");
  await signInDummy(page, { email, password });

  await page.getByRole("button", { name: "Home", exact: true }).click();
  await page.getByRole("button", { name: /Live desk/ }).click();
  await expect(page).toHaveURL(/\/tournaments/);
  await dismissProfilePrompt(page);
  await openCreateTournament(page);

  await expect(page.getByLabel("Tournament name")).toBeVisible();
  await expect(page.getByRole("button", { name: "Create tournament" })).toBeVisible();

  const joinType = page.getByLabel("Who can enter");
  if (await joinType.isVisible()) {
    await expect(page.getByLabel(/Max (teams|players)/)).toBeVisible();
    await expect(page.getByLabel("Room ID (optional)")).toBeVisible();
    await expect(page.getByLabel("Room password (optional)")).toBeVisible();
  }
});
