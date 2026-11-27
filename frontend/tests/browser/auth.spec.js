import { test, expect } from "@playwright/test";

/**
 * Authentication coverage.
 *
 * Every test drives the real interface against the real API. Accounts are
 * created per test so the suite can run repeatedly without interference.
 */

let sequence = 0;

/**
 * Register an account and fail loudly when the server throttles the run.
 *
 * The backend applies a global rate limit. When it is hit the suite cannot
 * continue, so the reason is surfaced instead of an obscure status code.
 */
async function register(request, baseURL, label) {
  const suffix = `${Date.now().toString(36)}${(++sequence).toString(36)}`;
  const username = `${label}_${suffix}`;
  const response = await request.post(`${baseURL}/api/auth/register`, {
    data: {
      fullName: `${label[0].toUpperCase()}${label.slice(1)} Tester`,
      username,
      email: `${username}@example.com`,
      password: "Testpass123",
    },
  });

  if (response.status() === 429) {
    throw new Error(
      "The backend rate limit was reached while creating test accounts. Restart the backend (or wait 15 minutes) and run the suite again.",
    );
  }
  expect(response.status()).toBe(201);
  return { username, password: "Testpass123", email: `${username}@example.com`, ...(await response.json()) };
}

/** Create a fresh account through the API and return its credentials. */
async function createAccount(request, baseURL, label = "user") {
  const account = await register(request, baseURL, label);
  return { username: account.username, password: account.password, email: account.email };
}

test("a visitor can register and lands in the chat workspace", async ({ page }) => {
  const suffix = `${Date.now().toString(36)}${(++sequence).toString(36)}`;
  const username = `newcomer_${suffix}`;

  await page.goto("/register");

  await page.getByTestId("sign-up-fullname").fill("Newcomer Tester");
  await page.getByTestId("sign-up-username").fill(username);
  await page.getByTestId("sign-up-email").fill(`${username}@example.com`);
  await page.getByTestId("sign-up-password").fill("Testpass123");
  await page.getByTestId("sign-up-confirm-password").fill("Testpass123");
  await page.getByTestId("sign-up-submit").click();

  await expect(page).toHaveURL("/");
  await expect(page.getByRole("heading", { name: "Chats" })).toBeVisible();
});

test("registration validates the form before contacting the server", async ({ page }) => {
  await page.goto("/register");

  await page.getByTestId("sign-up-fullname").fill("A");
  await page.getByTestId("sign-up-username").fill("bad name");
  await page.getByTestId("sign-up-email").fill("not-an-email");
  await page.getByTestId("sign-up-password").fill("123");
  await page.getByTestId("sign-up-confirm-password").fill("456");
  await page.getByTestId("sign-up-submit").click();

  await expect(page.getByText("Use at least 2 characters.")).toBeVisible();
  await expect(page.getByText("Use letters, numbers and underscores only.")).toBeVisible();
  await expect(page.getByText("That email address does not look right.")).toBeVisible();
  await expect(page.getByText("Passwords do not match.")).toBeVisible();
  await expect(page).toHaveURL("/register");
});

test("a registered user can sign in and the session survives a reload", async ({
  page,
  request,
  baseURL,
}) => {
  const account = await createAccount(request, baseURL, "returning");

  await page.goto("/signin");
  await page.getByTestId("sign-in-identifier").fill(account.username);
  await page.getByTestId("sign-in-password").fill(account.password);
  await page.getByTestId("sign-in-submit").click();

  await expect(page).toHaveURL("/");
  await expect(page.getByRole("heading", { name: "Chats" })).toBeVisible();

  // The token is persisted, so a reload restores the session without a login.
  await page.reload();
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("heading", { name: "Chats" })).toBeVisible();
});

test("an email address can be used to sign in", async ({ page, request, baseURL }) => {
  const account = await createAccount(request, baseURL, "emailuser");

  await page.goto("/signin");
  await page.getByTestId("sign-in-identifier").fill(account.email);
  await page.getByTestId("sign-in-password").fill(account.password);
  await page.getByTestId("sign-in-submit").click();

  await expect(page).toHaveURL("/");
});

test("a wrong password is rejected with a clear message", async ({ page, request, baseURL }) => {
  const account = await createAccount(request, baseURL, "careful");

  await page.goto("/signin");
  await page.getByTestId("sign-in-identifier").fill(account.username);
  await page.getByTestId("sign-in-password").fill("WrongPassword123");
  await page.getByTestId("sign-in-submit").click();

  await expect(page.getByTestId("sign-in-error")).toBeVisible();
  await expect(page.getByTestId("sign-in-error")).toContainText(/invalid credentials/i);
  await expect(page).toHaveURL("/signin");
});

test("an unknown account is rejected without leaking which field was wrong", async ({ page }) => {
  await page.goto("/signin");
  await page.getByTestId("sign-in-identifier").fill("definitely-not-a-user");
  await page.getByTestId("sign-in-password").fill("Testpass123");
  await page.getByTestId("sign-in-submit").click();

  await expect(page.getByTestId("sign-in-error")).toBeVisible();
  await expect(page).toHaveURL("/signin");
});

test("protected routes redirect to the sign-in screen", async ({ page }) => {
  await page.goto("/contacts");
  await expect(page).toHaveURL(/\/signin$/);

  await page.goto("/settings");
  await expect(page).toHaveURL(/\/signin$/);
});

test("signing out clears the session", async ({ page, request, baseURL }) => {
  const account = await createAccount(request, baseURL, "leaving");

  await page.goto("/signin");
  await page.getByTestId("sign-in-identifier").fill(account.username);
  await page.getByTestId("sign-in-password").fill(account.password);
  await page.getByTestId("sign-in-submit").click();
  await expect(page).toHaveURL("/");

  await page.goto("/settings");
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.getByRole("button", { name: "Sign out", exact: true }).last().click();

  await expect(page).toHaveURL(/\/signin$/);

  // The protected area is no longer reachable.
  await page.goto("/contacts");
  await expect(page).toHaveURL(/\/signin$/);
});

test("the sign-in and sign-up screens are linked", async ({ page }) => {
  await page.goto("/signin");
  await page.getByRole("button", { name: "Create an account" }).click();
  await expect(page).toHaveURL("/register");
  await expect(page.getByTestId("sign-up-form")).toBeVisible();

  await page.getByRole("button", { name: "Sign in", exact: true }).last().click();
  await expect(page).toHaveURL("/signin");
  await expect(page.getByTestId("sign-in-form")).toBeVisible();
});
