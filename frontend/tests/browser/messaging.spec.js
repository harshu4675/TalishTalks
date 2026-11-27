import { test, expect } from "@playwright/test";

/**
 * Messaging coverage.
 *
 * Two real accounts are connected as friends and driven through the interface
 * to prove that messages, edits, replies, typing hints and unread counters
 * behave correctly in both directions.
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

/**
 * Register two accounts, connect them as friends and open a conversation.
 */
async function createPair(request, baseURL) {
  const accounts = [];

  for (const label of ["alice", "bob"]) {
    accounts.push(await register(request, baseURL, label));
  }

  const [a, b] = accounts;
  const headersA = { Authorization: `Bearer ${a.token}` };
  const headersB = { Authorization: `Bearer ${b.token}` };

  const sent = await request.post(`${baseURL}/api/friends/request`, {
    headers: headersA,
    data: { username: b.username },
  });
  expect(sent.status()).toBe(201);

  const requests = await (
    await request.get(`${baseURL}/api/friends/requests`, { headers: headersB })
  ).json();
  expect(requests.received.length).toBeGreaterThan(0);

  const accepted = await request.put(`${baseURL}/api/friends/respond`, {
    headers: headersB,
    data: { requestId: requests.received[0]._id, action: "accept" },
  });
  expect(accepted.status()).toBe(200);

  const created = await request.post(`${baseURL}/api/chats/create`, {
    headers: headersA,
    data: { friendId: b.user._id },
  });
  expect(created.status()).toBe(200);
  const { chat } = await created.json();

  return { a, b, chat, headersA, headersB, password: "Testpass123" };
}

/**
 * Sign a page in and open the conversation.
 */
async function signIn(page, baseURL, account, chatId) {
  await page.goto("/signin");
  await page.getByTestId("sign-in-identifier").fill(account.username);
  await page.getByTestId("sign-in-password").fill("Testpass123");
  await page.getByTestId("sign-in-submit").click();
  await expect(page).toHaveURL("/");
  await page.goto(`/chat/${chatId}`);
  await expect(page.getByTestId("composer-input")).toBeVisible();
}

/** Locate a message by its text. */
const message = (page, text) => page.getByTestId("message-list").getByText(text, { exact: true });

/** Type a message and send it with the button. */
async function send(page, text) {
  await page.getByTestId("composer-input").fill(text);
  await page.getByTestId("composer-send").click();
  await expect(message(page, text)).toBeVisible();
}

test("two users exchange messages live", async ({ browser, request, baseURL }) => {
  const pair = await createPair(request, baseURL);
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();

  try {
    await signIn(pageA, baseURL, pair.a, pair.chat._id);
    await signIn(pageB, baseURL, pair.b, pair.chat._id);

    await send(pageA, "Hello from Alice");
    await expect(message(pageB, "Hello from Alice")).toBeVisible();

    // The preview of Bob's conversation shows Alice's newest message.
    await expect(pageB.getByTestId(`conversation-${pair.a.username}`)).toContainText(
      "Hello from Alice",
    );

    await send(pageB, "Hi Alice, Bob here");
    await expect(message(pageA, "Hi Alice, Bob here")).toBeVisible();

    // The preview now shows Bob's message, prefixed for the sender.
    await expect(pageA.getByTestId(`conversation-${pair.b.username}`)).toContainText(
      "Hi Alice, Bob here",
    );
    await expect(pageB.getByTestId(`conversation-${pair.a.username}`)).toContainText(
      "You: Hi Alice, Bob here",
    );
  } finally {
    await contextA.close();
    await contextB.close();
  }
});

test("a sent message is marked as seen when the other side reads it", async ({
  browser,
  request,
  baseURL,
}) => {
  const pair = await createPair(request, baseURL);
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();

  try {
    await signIn(pageA, baseURL, pair.a, pair.chat._id);
    await signIn(pageB, baseURL, pair.b, pair.chat._id);

    await send(pageA, "Did you read this?");
    await expect(message(pageB, "Did you read this?")).toBeVisible();

    await expect(
      pageA.locator('[data-message-id] .message__status--seen').first(),
    ).toBeVisible({ timeout: 15000 });
  } finally {
    await contextA.close();
    await contextB.close();
  }
});

test("a message can be edited and the change reaches the other side", async ({
  browser,
  request,
  baseURL,
}) => {
  const pair = await createPair(request, baseURL);
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();

  try {
    await signIn(pageA, baseURL, pair.a, pair.chat._id);
    await signIn(pageB, baseURL, pair.b, pair.chat._id);

    await send(pageA, "Original wording");
    await expect(message(pageB, "Original wording")).toBeVisible();

    await message(pageA, "Original wording").click();
    await pageA.getByRole("button", { name: "More actions" }).first().click();
    await pageA.getByRole("menuitem", { name: "Edit" }).click();

    const editor = pageA.getByLabel("Message content");
    await editor.fill("Corrected wording");
    await pageA.getByRole("button", { name: "Save changes" }).click();

    await expect(message(pageA, "Corrected wording")).toBeVisible();
    await expect(message(pageB, "Corrected wording")).toBeVisible();
    await expect(message(pageA, "Original wording")).toHaveCount(0);
  } finally {
    await contextA.close();
    await contextB.close();
  }
});

test("a reply quotes the message it answers", async ({ browser, request, baseURL }) => {
  const pair = await createPair(request, baseURL);
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();

  try {
    await signIn(pageA, baseURL, pair.a, pair.chat._id);
    await signIn(pageB, baseURL, pair.b, pair.chat._id);

    await send(pageA, "The original message");
    await expect(message(pageB, "The original message")).toBeVisible();

    await message(pageB, "The original message").hover();
    await pageB.getByRole("button", { name: "More actions" }).first().click();
    await pageB.getByRole("menuitem", { name: "Reply" }).click();
    await send(pageB, "The reply");

    await expect(pageA.locator(".message__reply")).toContainText("The original message");
  } finally {
    await contextA.close();
    await contextB.close();
  }
});

test("a typing hint is shown to the other participant", async ({ browser, request, baseURL }) => {
  const pair = await createPair(request, baseURL);
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();

  try {
    await signIn(pageA, baseURL, pair.a, pair.chat._id);
    await signIn(pageB, baseURL, pair.b, pair.chat._id);

    await pageB.getByTestId("composer-input").fill("Thinking about it");
    await expect(pageA.getByTestId("chat-status")).toContainText(/typing/i, { timeout: 10000 });

    await pageB.getByTestId("composer-input").fill("");
    await expect(pageA.getByTestId("chat-status")).not.toContainText(/typing/i, { timeout: 10000 });
  } finally {
    await contextA.close();
    await contextB.close();
  }
});

test("an unread counter appears for a conversation that is not open", async ({
  browser,
  request,
  baseURL,
}) => {
  const pair = await createPair(request, baseURL);
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();

  try {
    await signIn(pageA, baseURL, pair.a, pair.chat._id);
    await signIn(pageB, baseURL, pair.b, pair.chat._id);

    // Alice stays in the conversation list; Bob moves away.
    await pageA.goto("/");
    await expect(pageA.getByTestId(`conversation-${pair.b.username}`)).toBeVisible();
    await pageB.goto("/contacts");
    await expect(pageB.getByRole("heading", { name: "Contacts" })).toBeVisible();

    const response = await request.post(`${baseURL}/api/messages/send`, {
      headers: pair.headersB,
      data: { chatId: pair.chat._id, content: "Unread hello" },
    });
    expect(response.status()).toBe(201);

    await expect(
      pageA.getByTestId(`conversation-${pair.b.username}`).locator(".badge--count"),
    ).toBeVisible({ timeout: 15000 });
  } finally {
    await contextA.close();
    await contextB.close();
  }
});

test("a conversation can be opened from the contacts page", async ({
  browser,
  request,
  baseURL,
}) => {
  const pair = await createPair(request, baseURL);
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await signIn(page, baseURL, pair.a, pair.chat._id);
    await page.goto("/contacts");
    await page.getByTestId("contacts-tab-friends").click();

    const row = page.getByText(`@${pair.b.username}`).first();
    await expect(row).toBeVisible();
    await page.getByRole("button", { name: "Message" }).first().click();
    await expect(page).toHaveURL(new RegExp(`/chat/${pair.chat._id}$`));
    await expect(page.getByTestId("composer-input")).toBeVisible();
  } finally {
    await context.close();
  }
});

test("the layout adapts to a narrow viewport", async ({ browser, request, baseURL }) => {
  const pair = await createPair(request, baseURL);
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.setViewportSize({ width: 390, height: 844 });
    await signIn(page, baseURL, pair.a, pair.chat._id);

    await expect(page.getByTestId("composer-input")).toBeVisible();
    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    );
    expect(overflows).toBe(false);

    // The rail is hidden and the back button returns to the conversation list.
    await page.getByRole("button", { name: "Back to conversations" }).click();
    await expect(page).toHaveURL("/");
    await expect(page.getByRole("heading", { name: "Chats" })).toBeVisible();
  } finally {
    await context.close();
  }
});
