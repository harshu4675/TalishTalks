import { test, expect } from "@playwright/test";

let sequence = 0;

async function register(request, baseURL, label) {
  const username = `${label}_${Date.now().toString(36)}${(++sequence).toString(36)}`;
  const response = await request.post(`${baseURL}/api/auth/register`, {
    data: { fullName: `${label} Story Tester`, username, email: `${username}@example.com`, password: "Testpass123" },
  });
  expect(response.status()).toBe(201);
  return { ...(await response.json()), username };
}

async function friendPair(request, baseURL) {
  const alice = await register(request, baseURL, "alice");
  const bob = await register(request, baseURL, "bobby");
  const aliceHeaders = { Authorization: `Bearer ${alice.token}` };
  const bobHeaders = { Authorization: `Bearer ${bob.token}` };
  const sent = await request.post(`${baseURL}/api/friends/request`, { headers: aliceHeaders, data: { username: bob.username } });
  expect(sent.status()).toBe(201);
  const received = await request.get(`${baseURL}/api/friends/requests`, { headers: bobHeaders });
  const requests = await received.json();
  const accepted = await request.put(`${baseURL}/api/friends/respond`, { headers: bobHeaders, data: { requestId: requests.received[0]._id, action: "accept" } });
  expect(accepted.status()).toBe(200);
  return { alice, bob };
}

async function signIn(page, account) {
  await page.goto("/signin");
  await page.getByTestId("sign-in-identifier").fill(account.username);
  await page.getByTestId("sign-in-password").fill("Testpass123");
  await page.getByTestId("sign-in-submit").click();
  await expect(page).toHaveURL("/");
}

test("mobile navigation exposes settings and friends can view text stories", async ({ browser, request, baseURL }) => {
  const { alice, bob } = await friendPair(request, baseURL);
  const aliceContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const bobContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const alicePage = await aliceContext.newPage();
  const bobPage = await bobContext.newPage();

  try {
    await signIn(alicePage, alice);
    const navigation = alicePage.getByRole("navigation", { name: "Primary navigation" });
    for (const width of [320, 375, 390, 430, 768, 1024, 1440]) {
      await alicePage.setViewportSize({ width, height: 900 });
      const hasHorizontalOverflow = await alicePage.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
      expect(hasHorizontalOverflow, `Unexpected horizontal overflow at ${width}px`).toBe(false);
      if (width <= 860) await expect(navigation).toBeVisible();
      else await expect(navigation).toBeHidden();
    }
    await alicePage.setViewportSize({ width: 390, height: 844 });
    await expect(navigation.getByRole("link", { name: "Settings" })).toBeVisible();
    await navigation.getByRole("link", { name: "Settings" }).click();
    await expect(alicePage.getByRole("heading", { name: "Settings" }).first()).toBeVisible();
    await expect(alicePage).toHaveURL("/settings");
    await navigation.getByRole("link", { name: "Chats" }).click();
    await expect(alicePage).toHaveURL("/");

    await alicePage.getByRole("button", { name: "Create a story" }).click();
    await alicePage.getByLabel("Your moment").fill("A real moment, shared with friends");
    await alicePage.getByRole("button", { name: "Share story" }).click();
    await expect(alicePage.getByRole("button", { name: "View your story" })).toBeVisible();

    await signIn(bobPage, bob);
    const aliceStory = bobPage.getByRole("button", { name: `View ${alice.user.fullName}'s story` });
    await expect(aliceStory).toBeVisible();
    const viewed = bobPage.waitForResponse((response) => response.url().includes("/api/stories/") && response.url().endsWith("/view") && response.status() === 200);
    await aliceStory.click();
    await expect(bobPage.getByRole("dialog", { name: `${alice.user.fullName}'s story` })).toContainText("A real moment, shared with friends");
    await viewed;
    await bobPage.getByRole("button", { name: "Close story" }).click();

    await alicePage.reload();
    await alicePage.getByRole("button", { name: "View your story" }).click();
    await expect(alicePage.getByText("1 view", { exact: true })).toBeVisible();
    await expect(alicePage.getByText("Bobby Story Tester", { exact: true })).toBeVisible();
  } finally {
    await aliceContext.close();
    await bobContext.close();
  }
});
