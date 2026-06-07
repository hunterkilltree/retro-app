import { test, expect } from "@playwright/test";
import { bootstrapSoloAdminInStart, addNote, moveToReview, moveToDone, cleanupRoom } from "./helpers";

test.describe("PDF export", () => {
  test("Export PDF on Done downloads a .pdf file", async ({ page }) => {
    // A solo admin can run the whole flow (guests aren't required to start).
    const roomCode = await bootstrapSoloAdminInStart(page);
    try {
      await addNote(page, "Shipped the voting feature");
      await moveToReview(page);
      await moveToDone(page);

      const exportBtn = page.getByRole("button", { name: "Export PDF" });
      await expect(exportBtn).toBeVisible();

      const [download] = await Promise.all([
        page.waitForEvent("download"),
        exportBtn.click(),
      ]);

      // The backend streams a PDF named retro-<ROOMCODE>.pdf.
      expect(download.suggestedFilename()).toMatch(/\.pdf$/i);
    } finally {
      await cleanupRoom(page, roomCode);
    }
  });
});
