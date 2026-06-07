import { test, expect } from "@playwright/test";
import {
  bootstrapAdminAndGuest,
  configureSetup,
  startSession,
  addNote,
  moveToReview,
  moveToDone,
} from "./helpers";

test.describe("core happy path (admin + guest, real-time)", () => {
  test("runs a full retro from setup through to Done with live sync", async ({ browser }) => {
    const { adminCtx, guestCtx, admin, guest } = await bootstrapAdminAndGuest(browser);

    try {
      // ── Lobby: admin sees both participants ──
      // "Ada" also shows in the top bar (the current user), so scope it there.
      await expect(admin.locator("header").getByText("Ada")).toBeVisible();
      // "Grace" (the guest) appears only in the lobby — proves real-time join sync.
      await expect(admin.getByText("Grace")).toBeVisible();

      // ── Setup → Start ──
      await configureSetup(admin, {
        title: "Sprint.06.2026",
        columns: ["What went well", "What to improve"],
        votes: 3,
      });
      await startSession(admin);

      // Both clients transition to the writing (START) state in real time.
      await expect(admin.getByRole("button", { name: "Move to Review" })).toBeVisible();
      await expect(guest.locator("header").getByText("Writing")).toBeVisible();

      // ── Write a note as admin ──
      await addNote(admin, "Great teamwork this sprint");

      // In START, guests see others' notes only as skeletons (content hidden).
      await expect(guest.getByText("Great teamwork this sprint")).toHaveCount(0);

      // ── Review: notes are revealed to everyone ──
      await moveToReview(admin);
      await expect(admin.locator("header").getByText("Review")).toBeVisible();
      // Real-time + reveal: the guest now sees the admin's note content.
      await expect(guest.getByText("Great teamwork this sprint")).toBeVisible();

      // ── Cast a vote and see the live count ──
      const firstVote = admin.getByRole("button", { name: /▲/ }).first();
      await firstVote.click();
      await expect(admin.getByRole("button", { name: "▲ 1" })).toBeVisible();
      // Vote tally propagates to the guest too.
      await expect(guest.getByRole("button", { name: "▲ 1" })).toBeVisible();

      // ── Done ──
      await moveToDone(admin);
      await expect(guest.getByText("Session Summary")).toBeVisible();
      // The note is part of the Done summary on both clients.
      await expect(admin.getByText("Great teamwork this sprint")).toBeVisible();
      await expect(guest.getByText("Great teamwork this sprint")).toBeVisible();
    } finally {
      await adminCtx.close();
      await guestCtx.close();
    }
  });

  test("guest waits during setup and cannot start the session", async ({ browser }) => {
    const { adminCtx, guestCtx, admin, guest } = await bootstrapAdminAndGuest(browser);
    try {
      // Guest sees the waiting screen and has no Start control.
      await expect(guest.getByText("Waiting for admin to start")).toBeVisible();
      await expect(guest.getByRole("button", { name: "Start Session" })).toHaveCount(0);

      // Admin's Start button is gated until title + a column + votes are set.
      await expect(admin.getByRole("button", { name: "Start Session" })).toBeDisabled();
      await configureSetup(admin, { title: "Sprint.06.2026", columns: ["Keep"], votes: 2 });
      await expect(admin.getByRole("button", { name: "Start Session" })).toBeEnabled();
    } finally {
      await adminCtx.close();
      await guestCtx.close();
    }
  });
});
