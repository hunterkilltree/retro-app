-- Retrospective title (e.g. "Sprint.06.2026").
-- Host must set it during SETUP before the room can start.
ALTER TABLE rooms ADD COLUMN title VARCHAR(120);
