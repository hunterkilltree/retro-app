-- Admin can remove a participant from the final summary (DONE state).
-- Soft-removal keeps their notes intact; removed participants are hidden
-- from snapshots and from the PDF export participant list.
ALTER TABLE participants ADD COLUMN removed BOOLEAN NOT NULL DEFAULT false;
