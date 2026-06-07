-- Voting feature (REVIEW state).
-- Host must set votes_per_user during SETUP before the room can start.
ALTER TABLE rooms ADD COLUMN votes_per_user INT;

CREATE TABLE votes (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id        UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  note_id        UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  created_at     TIMESTAMP NOT NULL DEFAULT now(),
  -- One vote per participant per note (dot-voting: at most one vote per note).
  UNIQUE (note_id, participant_id)
);

CREATE INDEX idx_votes_room        ON votes(room_id);
CREATE INDEX idx_votes_note        ON votes(note_id);
CREATE INDEX idx_votes_participant ON votes(participant_id);
