CREATE TYPE board_state AS ENUM ('SETUP','START','REVIEW','DONE');
CREATE TYPE participant_role AS ENUM ('ADMIN','GUEST');

CREATE TABLE rooms (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code        VARCHAR(12) NOT NULL UNIQUE,
  state            board_state NOT NULL DEFAULT 'SETUP',
  timer_seconds    INT NOT NULL DEFAULT 300,
  timer_started_at TIMESTAMP,
  created_at       TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE participants (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id       UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  username      VARCHAR(50) NOT NULL,
  color         VARCHAR(7) NOT NULL,
  role          participant_role NOT NULL DEFAULT 'GUEST',
  session_token VARCHAR(64) NOT NULL UNIQUE,
  joined_at     TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE board_columns (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id    UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  title      VARCHAR(100) NOT NULL,
  color      VARCHAR(7) NOT NULL,
  position   INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE note_groups (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id    UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  column_id  UUID NOT NULL REFERENCES board_columns(id) ON DELETE CASCADE,
  name       VARCHAR(100),
  position   INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE notes (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id        UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  column_id      UUID NOT NULL REFERENCES board_columns(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  group_id       UUID REFERENCES note_groups(id) ON DELETE SET NULL,
  content        TEXT NOT NULL,
  position       INT NOT NULL DEFAULT 0,
  created_at     TIMESTAMP NOT NULL DEFAULT now(),
  updated_at     TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE action_items (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id    UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  position   INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_participants_room  ON participants(room_id);
CREATE INDEX idx_columns_room       ON board_columns(room_id);
CREATE INDEX idx_notes_room         ON notes(room_id);
CREATE INDEX idx_notes_column       ON notes(column_id);
CREATE INDEX idx_notes_group        ON notes(group_id);
CREATE INDEX idx_note_groups_room   ON note_groups(room_id);
CREATE INDEX idx_action_items_room  ON action_items(room_id);
