import { test, expect } from "@playwright/test";
import {
  bootstrapAdminAndGuest,
  configureSetup,
  startSession,
  moveToReview,
  moveToDone,
  cleanupRoom,
} from "./helpers";

test.describe("delete room", () => {
  test("admin deletes from the Done screen and everyone is redirected home", async ({ browser }) => {
    const { adminCtx, guestCtx, admin, guest } = await bootstrapAdminAndGuest(browser);

    try {
      // Drive the room to Done.
      await configureSetup(admin, { title: "Sprint.06.2026", columns: ["Keep"], votes: 2 });
      await startSession(admin);
      await moveToReview(admin);
      await moveToDone(admin);
      await expect(guest.getByText("Session Summary")).toBeVisible();

      // Two "Delete Room" buttons exist for the admin on Done: one in the top
      // bar and one in the Done action header. The Done-screen one is last in DOM.
      await admin.getByRole("button", { name: "Delete Room" }).last().click();
      await admin.getByRole("button", { name: "Yes, delete" }).click();

      // Admin is redirected back to the landing page.
      await expect(admin).toHaveURL(/\/$/);
      await expect(admin.getByRole("button", { name: "Generate Room" })).toBeVisible();

      // Guest is pushed home in real time via the ROOM_CLOSED broadcast.
      await expect(guest.getByRole("button", { name: "Generate Room" })).toBeVisible();
    } finally {
      await adminCtx.close();
      await guestCtx.close();
    }
  });

  test("guest never sees a Delete Room button", async ({ browser }) => {
    const { adminCtx, guestCtx, admin, guest, roomCode } = await bootstrapAdminAndGuest(browser);
    try {
      await configureSetup(admin, { title: "Sprint.06.2026", columns: ["Keep"], votes: 2 });
      await startSession(admin);
      await moveToReview(admin);
      await moveToDone(admin);
      await expect(guest.getByText("Session Summary")).toBeVisible();

      // Delete is admin-only — the guest has no such control anywhere.
      await expect(guest.getByRole("button", { name: "Delete Room" })).toHaveCount(0);
    } finally {
      await cleanupRoom(admin, roomCode);
      await adminCtx.close();
      await guestCtx.close();
    }
  });
});
