import { type Browser, type BrowserContext, type Page, expect } from "@playwright/test";

/**
 * Shared helpers for the Retro full-stack E2E tests.
 *
 * Selectors are intentionally based on user-visible text / placeholders / roles
 * (not CSS-module class names, which are hashed at build time) so the tests stay
 * resilient to styling changes.
 */

/** Create a fresh room from the landing page and return its room code. */
export async function generateRoom(page: Page): Promise<string> {
  await page.goto("/");
  await page.getByRole("button", { name: "Generate Room" }).click();
  // Landing page pushes to /{ROOM_CODE} after the room is created.
  await page.waitForURL(/\/[A-Z0-9-]{3,}$/);
  const code = new URL(page.url()).pathname.replace(/^\//, "");
  expect(code).not.toEqual("");
  return code;
}

/**
 * Join the given room as `name`. The FIRST participant to join becomes the
 * admin (host); everyone after is a guest — so order matters in tests.
 */
export async function joinRoom(page: Page, roomCode: string, name: string): Promise<void> {
  if (!page.url().includes(`/${roomCode}`)) {
    await page.goto(`/${roomCode}`);
  }
  // Join gate: name field (placeholder "Sara") + "Join Room".
  await page.getByPlaceholder("Sara").fill(name);
  await page.getByRole("button", { name: "Join Room" }).click();
}

/** Assert we're on the admin SETUP screen. */
export async function expectAdminSetup(page: Page): Promise<void> {
  await expect(page.getByText("Retrospective Title")).toBeVisible();
}

/** Assert a guest is parked on the SETUP waiting screen. */
export async function expectGuestWaiting(page: Page): Promise<void> {
  await expect(page.getByText("Waiting for admin to start")).toBeVisible();
}

export interface SetupOptions {
  title: string;
  columns: string[];
  votes: number;
}

/** Fill in the required SETUP fields: title, columns, and votes-per-participant. */
export async function configureSetup(page: Page, opts: SetupOptions): Promise<void> {
  const titleInput = page.getByPlaceholder("e.g. Sprint.06.2026");
  await titleInput.fill(opts.title);
  await titleInput.blur(); // PATCH fires on blur

  for (const title of opts.columns) {
    await page.getByPlaceholder("Column name").fill(title);
    await page.getByRole("button", { name: "Add Column" }).click();
    // Column row appears once the server broadcasts it back.
    await expect(page.getByText(title, { exact: true })).toBeVisible();
  }

  // Votes-per-participant buttons are single digits (1..6). Exact match avoids
  // colliding with anything else on the page.
  await page.getByRole("button", { name: String(opts.votes), exact: true }).click();
}

/** Click "Start Session" (asserts it's enabled first). */
export async function startSession(page: Page): Promise<void> {
  const start = page.getByRole("button", { name: "Start Session" });
  await expect(start).toBeEnabled();
  await start.click();
}

/** Write a note into the first column (admin/guest in START state). */
export async function addNote(page: Page, text: string): Promise<void> {
  await page.getByRole("button", { name: "+ Add note" }).first().click();
  await page.getByPlaceholder("Write your note").fill(text);
  // exact match so we don't also match the "+ Add note" triggers in other columns.
  await page.getByRole("button", { name: "Add note", exact: true }).click();
}

export async function moveToReview(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Move to Review" }).click();
}

export async function moveToDone(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Move to Done" }).click();
  await expect(page.getByText("Session Summary")).toBeVisible();
}

export interface AdminGuest {
  adminCtx: BrowserContext;
  guestCtx: BrowserContext;
  admin: Page;
  guest: Page;
  roomCode: string;
}

/**
 * Bootstrap a room with an admin (joined first) and a guest (joined second), in
 * separate browser contexts so each has its own session token / storage.
 */
export async function bootstrapAdminAndGuest(
  browser: Browser,
  adminName = "Ada",
  guestName = "Grace"
): Promise<AdminGuest> {
  const adminCtx = await browser.newContext();
  const guestCtx = await browser.newContext();
  const admin = await adminCtx.newPage();
  const guest = await guestCtx.newPage();

  const roomCode = await generateRoom(admin);
  await joinRoom(admin, roomCode, adminName);
  await expectAdminSetup(admin);

  await joinRoom(guest, roomCode, guestName);
  await expectGuestWaiting(guest);

  return { adminCtx, guestCtx, admin, guest, roomCode };
}

/** Solo admin: create, join, configure, and start — leaving the room in START. */
export async function bootstrapSoloAdminInStart(
  page: Page,
  opts: SetupOptions = {
    title: "Sprint.06.2026",
    columns: ["What went well", "What to improve"],
    votes: 3,
  }
): Promise<string> {
  const roomCode = await generateRoom(page);
  await joinRoom(page, roomCode, "Ada");
  await expectAdminSetup(page);
  await configureSetup(page, opts);
  await startSession(page);
  await expect(page.getByRole("button", { name: "Move to Review" })).toBeVisible();
  return roomCode;
}
