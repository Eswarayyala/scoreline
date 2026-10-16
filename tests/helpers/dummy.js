export function dummyCredentials() {
  return {
    name: process.env.PLAYWRIGHT_DUMMY_NAME || "dummybot",
    email: process.env.PLAYWRIGHT_DUMMY_EMAIL || "",
    password: process.env.PLAYWRIGHT_DUMMY_PASSWORD || "",
  };
}

export async function dismissProfilePrompt(page) {
  const skip = page.getByRole("button", { name: "Skip for now" });
  try {
    await skip.waitFor({ state: "visible", timeout: 5000 });
    await skip.click();
    await skip.waitFor({ state: "hidden", timeout: 5000 });
  } catch {
    /* signed-in users who already skipped keep no prompt */
  }
}

export async function openCreateTournament(page) {
  const fromRail = page.getByRole("button", { name: "New event" });
  const fromList = page.getByRole("button", { name: "+ New tournament" });
  if (await fromRail.isVisible().catch(() => false)) {
    await fromRail.click();
    return;
  }
  await fromList.click();
}

export async function signInDummy(page, { email, password }) {
  const dialog = page.getByRole("dialog", { name: "Sign in to GrindInfo" });
  await dialog.waitFor({ state: "visible" });
  const signInLink = dialog.getByRole("button", { name: "Sign in", exact: true });
  if (await dialog.getByRole("button", { name: "Create account" }).isVisible() && await signInLink.isVisible()) {
    await signInLink.click();
  }
  await dialog.getByPlaceholder(/email or Name#1234|ghostpeak#1234|you@example.com/).fill(email);
  await dialog.getByPlaceholder("At least 6 characters").fill(password);
  await dialog.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByRole("dialog", { name: "Sign in to GrindInfo" }).waitFor({ state: "hidden", timeout: 20_000 });
  await dismissProfilePrompt(page);
}

export async function signUpDummy(page, { name, email, password }) {
  const dialog = page.getByRole("dialog", { name: "Sign in to GrindInfo" });
  await dialog.waitFor({ state: "visible" });
  const createLink = dialog.getByRole("button", { name: "Create an account" });
  if (await createLink.isVisible()) await createLink.click();
  await dialog.getByPlaceholder("ghostpeak").fill(name);
  await dialog.getByPlaceholder("you@example.com").fill(email);
  await dialog.getByPlaceholder("At least 6 characters").fill(password);
  await dialog.getByRole("button", { name: "Create account" }).click();
  const error = dialog.getByText(/already registered|doesn't look right|Something went wrong/i);
  if (await error.isVisible().catch(() => false)) {
    const message = (await error.textContent())?.trim() || "Could not create dummy account";
    if (/already registered/i.test(message)) {
      await signInDummy(page, { email, password });
      return;
    }
    throw new Error(message);
  }
  await page.getByRole("dialog", { name: "Sign in to GrindInfo" }).waitFor({ state: "hidden", timeout: 20_000 });
  await dismissProfilePrompt(page);
}

export async function browseAsGuest(page) {
  const dialog = page.getByRole("dialog", { name: "Sign in to GrindInfo" });
  await dialog.waitFor({ state: "visible" });
  await dialog.getByRole("button", { name: "Browse as guest" }).click();
  await dialog.waitFor({ state: "hidden" });
}
