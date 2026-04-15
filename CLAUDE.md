# Retro App — Project Overview

Real-time retrospective board. No auth. Users generate a room, share a link, and run a structured retro session.

---

## Monorepo Layout

| Directory        | Role |
|------------------|------|
| `retro-fe/`      | Next.js 15 LTS (App Router) + TypeScript — has its own `CLAUDE.md` |
| `retro-server/`  | Java 21 + Spring Boot 4.0.3 — has its own `CLAUDE.md` |
| `.claude/`       | Shared rule files (e.g. `websocket.md`) |

> **Subagent instructions:** load the `CLAUDE.md` inside the sub-project directory you are working in. For real-time / WebSocket tasks, also read `.claude/websocket.md`.

---

## Rule Files Index

| File | Load when… |
|------|-----------|
| `retro-fe/CLAUDE.md` | Any frontend (Next.js / TypeScript / CSS) task |
| `retro-server/CLAUDE.md` | Any backend (Java / Spring Boot / SQL) task |
| `.claude/websocket.md` | Adding or changing WebSocket messages on either side |

---

## Database Schema (PostgreSQL 16)

| Table           | PK (UUID) | Key Columns |
|-----------------|-----------|-------------|
| `rooms`         | `id`      | `room_code` (UK), `state`, `timer_seconds`, `timer_started_at`, `created_at` |
| `participants`  | `id`      | `room_id` (FK), `username`, `color`, `role`, `session_token`, `joined_at` |
| `board_columns` | `id`      | `room_id` (FK), `title`, `color`, `position`, `created_at` |
| `notes`         | `id`      | `room_id` (FK), `column_id` (FK), `participant_id` (FK), `group_id` (FK nullable), `content`, `position` |
| `note_groups`   | `id`      | `room_id` (FK), `column_id` (FK), `name`, `position` |
| `action_items`  | `id`      | `room_id` (FK), `content`, `position` |

- All PKs are `UUID`. All entities have `created_at`; `notes` also has `updated_at`.
- `notes.group_id` is nullable — ungrouped notes have `group_id = NULL`.

---

## Board States (linear, forward-only)

`SETUP → START → REVIEW → DONE`

| State    | What happens |
|----------|-------------|
| `SETUP`  | Admin configures columns + timer; lobby shows connected users |
| `START`  | Countdown runs; everyone writes notes; guests see only their own |
| `REVIEW` | All notes revealed; admin groups notes via drag-and-drop |
| `DONE`   | Summary view; admin adds action items and can export PDF |

---

## Cross-Cutting Conventions

- Room codes are short uppercase alphanumeric strings (e.g. `XK9-47B`).
- First user in a room becomes admin — no login system.
- Guests pick a username and color before entering.
- All mutations go through WebSocket; REST is only for room creation and PDF export.
- Theme: light base `#FBF0D9`, dark base `#0e0e10`. Persisted in `localStorage`.
