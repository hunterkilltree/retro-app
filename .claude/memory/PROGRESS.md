# Retro App — Implementation Progress

**Goal:** Implement all 42 functional requirements (FR-01 → FR-42) to produce a fully working real-time retrospective board.

**Stack:** Next.js 15 (App Router, TypeScript) · Java 21 + Spring Boot 4 · PostgreSQL 16 · WebSocket (STOMP/SockJS) · Zustand

**How to resume:** Read this file first, then read `retro-app/CLAUDE.md`, the relevant sub-project `CLAUDE.md`, and `.claude/websocket.md` for WS tasks. Then continue from the first `🔲 TODO` item below.

---

## Legend
- ✅ DONE — fully implemented & verified
- 🔲 TODO — not started
- 🚧 IN PROGRESS — partially done

---

## Phase 1 — Room Bootstrap (FR-01 → FR-06)

| FR | Story | Status | Notes |
|----|-------|--------|-------|
| FR-01 | Landing page with "Generate Room" button at `/` | ✅ DONE | `retro-fe/app/page.tsx` |
| FR-02 | Clicking button creates room + redirects to `/:roomCode` | ✅ DONE | `POST /api/rooms` → `retro-fe/app/api/rooms/route.ts` |
| FR-03 | First user at `/:roomCode` → admin role | ✅ DONE | `RoomController.joinRoom()` |
| FR-04 | Subsequent users → guest role | ✅ DONE | same as FR-03 |
| FR-05 | Guest must pick username + color before entering | ✅ DONE | `retro-fe/app/[roomCode]/page.tsx` join form |
| FR-06 | Shareable URL; admin can copy from top bar | 🔲 TODO | Top bar component not yet built |

---

## Phase 2 — Admin Setup / SETUP State (FR-07 → FR-12)

| FR | Story | Status | Notes |
|----|-------|--------|-------|
| FR-07 | Admin sees setup screen before session starts | 🔲 TODO | Board page not yet built |
| FR-08 | Admin can add columns (title + color) | 🔲 TODO | No `POST /api/rooms/{code}/columns` endpoint yet |
| FR-09 | Admin can reorder columns via drag-and-drop | 🔲 TODO | |
| FR-10 | Admin can set countdown timer (3/5/10/15 min) | 🔲 TODO | |
| FR-11 | Admin sees lobby with connected users | 🔲 TODO | Needs WS PARTICIPANT_JOINED event wired to UI |
| FR-12 | Admin clicks "Start Session" → state → START | 🔲 TODO | No `PATCH /rooms/{code}/state` endpoint |

---

## Phase 3 — START State (FR-13 → FR-21)

| FR | Story | Status | Notes |
|----|-------|--------|-------|
| FR-13 | Countdown timer runs live for all users | 🔲 TODO | WS broadcast needed |
| FR-14 | Any user can add a note to any column | 🔲 TODO | No note creation endpoint/WS event |
| FR-15 | Note stores: text, author, color, columnId, timestamp | 🔲 TODO | Entity exists; endpoint missing |
| FR-16 | Author can edit/delete their own note | 🔲 TODO | |
| FR-17 | Admin sees full text of all notes | 🔲 TODO | Visibility logic in FE |
| FR-18 | Guests see own notes in full; others as skeleton blocks | 🔲 TODO | Visibility logic in FE |
| FR-19 | Note count per column visible to everyone | 🔲 TODO | |
| FR-20 | Timer-end alert to all users | 🔲 TODO | WS broadcast |
| FR-21 | Admin can advance to REVIEW at any time | 🔲 TODO | State transition endpoint |

---

## Phase 4 — REVIEW State (FR-22 → FR-28)

| FR | Story | Status | Notes |
|----|-------|--------|-------|
| FR-22 | All notes fully revealed to everyone | 🔲 TODO | FE visibility switch on state |
| FR-23 | Notes read-only for guests | 🔲 TODO | FE guard |
| FR-24 | Admin drag notes onto each other → create group | 🔲 TODO | DnD + `POST /rooms/{code}/groups` |
| FR-25 | Admin rename group by clicking label | 🔲 TODO | `PATCH /rooms/{code}/groups/{id}` |
| FR-26 | Admin drag note out of group → ungroup | 🔲 TODO | `PATCH /rooms/{code}/notes/{id}` |
| FR-27 | Group changes sync in real time | 🔲 TODO | WS events |
| FR-28 | Admin advances to DONE | 🔲 TODO | State transition |

---

## Phase 5 — DONE State (FR-29 → FR-33)

| FR | Story | Status | Notes |
|----|-------|--------|-------|
| FR-29 | Board shows full session summary | 🔲 TODO | |
| FR-30 | Admin adds action items | 🔲 TODO | `POST /rooms/{code}/action-items` |
| FR-31 | Action items visible to all in real time | 🔲 TODO | WS event |
| FR-32 | Guests see summary + action items (read-only) | 🔲 TODO | |
| FR-33 | Admin can export PDF | 🔲 TODO | |

---

## Phase 6 — PDF Export (FR-34 → FR-35)

| FR | Story | Status | Notes |
|----|-------|--------|-------|
| FR-34 | PDF generated on demand | 🔲 TODO | REST endpoint on server |
| FR-35 | PDF contains: title, columns, groups, notes, action items | 🔲 TODO | |

---

## Phase 7 — Real-Time Sync (FR-36 → FR-37)

| FR | Story | Status | Notes |
|----|-------|--------|-------|
| FR-36 | All board changes sync via WebSocket | 🔲 TODO | WS events needed for notes, groups, state, action-items |
| FR-37 | New user joining mid-session gets full board state | ✅ DONE | `GET /api/rooms/{code}/me` snapshot |

---

## Phase 8 — UI / Theme (FR-38 → FR-42)

| FR | Story | Status | Notes |
|----|-------|--------|-------|
| FR-38 | Default bg `#FBF0D9` | 🔲 TODO | globals.css needs verification |
| FR-39 | Light/dark mode toggle in top bar | 🔲 TODO | Top bar not yet built |
| FR-40 | Theme saved to localStorage | 🔲 TODO | |
| FR-41 | Columns color-coded; notes have author color left border | 🔲 TODO | |
| FR-42 | Top bar: logo, board state, room ID, user identity (crown for admin) | 🔲 TODO | |

---

## WebSocket Events Needed (cross-cutting)

| Event Type | Trigger | Payload | Status |
|------------|---------|---------|--------|
| `PARTICIPANT_JOINED` | User joins room | participant data | ✅ defined in server |
| `PARTICIPANT_LEFT` | User disconnects | participantId | 🔲 TODO |
| `STATE_CHANGED` | Admin advances state | new state | 🔲 TODO |
| `COLUMN_CREATED` | Admin adds column | column data | 🔲 TODO |
| `COLUMN_UPDATED` | Admin edits/reorders column | column data | 🔲 TODO |
| `COLUMN_DELETED` | Admin removes column | columnId | 🔲 TODO |
| `NOTE_CREATED` | User adds note | note data | 🔲 TODO |
| `NOTE_UPDATED` | User edits note | note data | 🔲 TODO |
| `NOTE_DELETED` | User deletes note | noteId | 🔲 TODO |
| `GROUP_CREATED` | Admin groups notes | group + updated notes | 🔲 TODO |
| `GROUP_UPDATED` | Admin renames group | group data | 🔲 TODO |
| `GROUP_DELETED` | Admin ungroups all | groupId | 🔲 TODO |
| `ACTION_ITEM_CREATED` | Admin adds action item | action item data | 🔲 TODO |
| `ACTION_ITEM_UPDATED` | Admin edits action item | action item data | 🔲 TODO |
| `ACTION_ITEM_DELETED` | Admin deletes action item | actionItemId | 🔲 TODO |
| `TIMER_TICK` | Server ticks every second | remaining seconds | 🔲 TODO |
| `TIMER_EXPIRED` | Timer hits 0 | — | 🔲 TODO |

---

## REST Endpoints Needed

| Method | Path | Purpose | Status |
|--------|------|---------|--------|
| POST | `/api/rooms` | Create room | ✅ DONE |
| POST | `/api/rooms/{code}/join` | Join room | ✅ DONE |
| GET | `/api/rooms/{code}/me` | Room snapshot | ✅ DONE |
| PATCH | `/api/rooms/{code}/state` | Advance board state | 🔲 TODO |
| POST | `/api/rooms/{code}/columns` | Add column | 🔲 TODO |
| PATCH | `/api/rooms/{code}/columns/{id}` | Edit/reorder column | 🔲 TODO |
| DELETE | `/api/rooms/{code}/columns/{id}` | Delete column | 🔲 TODO |
| POST | `/api/rooms/{code}/notes` | Create note | 🔲 TODO |
| PATCH | `/api/rooms/{code}/notes/{id}` | Edit note / move group | 🔲 TODO |
| DELETE | `/api/rooms/{code}/notes/{id}` | Delete note | 🔲 TODO |
| POST | `/api/rooms/{code}/groups` | Create group | 🔲 TODO |
| PATCH | `/api/rooms/{code}/groups/{id}` | Rename group | 🔲 TODO |
| DELETE | `/api/rooms/{code}/groups/{id}` | Delete group | 🔲 TODO |
| POST | `/api/rooms/{code}/action-items` | Add action item | 🔲 TODO |
| PATCH | `/api/rooms/{code}/action-items/{id}` | Edit action item | 🔲 TODO |
| DELETE | `/api/rooms/{code}/action-items/{id}` | Delete action item | 🔲 TODO |
| GET | `/api/rooms/{code}/export/pdf` | Export PDF | 🔲 TODO |

---

## Next Session — Pick Up Here

**Current task:** Start Phase 2 — implement FR-06 through FR-12.

**Order of work:**
1. Backend: Column CRUD endpoints + state-advance endpoint + WS events (COLUMN_CREATED, STATE_CHANGED)
2. Frontend: Board page scaffold → TopBar → SETUP screen (add columns, timer picker, lobby)
3. Wire WS connection in FE (SockJS/STOMP client, subscribe to `/topic/rooms/{code}`)

**Files to read before starting:**
- `/sessions/ecstatic-focused-davinci/mnt/retro-app/CLAUDE.md`
- `/sessions/ecstatic-focused-davinci/mnt/retro-app/retro-fe/CLAUDE.md`
- `/sessions/ecstatic-focused-davinci/mnt/retro-app/retro-server/CLAUDE.md`
- `/sessions/ecstatic-focused-davinci/mnt/retro-app/.claude/websocket.md`
