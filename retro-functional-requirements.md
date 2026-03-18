# Retro App — Functional Requirements

## Overview
A real-time retrospective board web app. No login required. Users generate a room, share a link, and run a structured retro session with 3 board states.

---

## 1. Room Management

- **FR-01** Visiting the root URL (`/`) shows a landing page with a single "Generate Room" button.
- **FR-02** Clicking "Generate Room" creates a room with a unique ID and redirects to `/:roomId`.
- **FR-03** The first user to open `/:roomId` is automatically assigned the **admin** role.
- **FR-04** Every subsequent user who opens `/:roomId` is assigned the **guest** role.
- **FR-05** Before entering the board, each guest must input a **username** and select a **color**.
- **FR-06** The room has a shareable URL. Admin can copy it from the top bar.

---

## 2. Admin Setup (pre-session)

- **FR-07** Admin sees a setup screen before the session starts.
- **FR-08** Admin can **add columns** — each column requires a title and a color.
- **FR-09** Admin can **reorder columns** via drag and drop.
- **FR-10** Admin can **set a countdown timer** (options: 3, 5, 10, 15 minutes).
- **FR-11** Admin sees a **lobby** showing all users currently in the room.
- **FR-12** Admin clicks **"Start Session"** to begin — board state changes to `START`.

---

## 3. Board States

The board has 3 states. Only admin can advance the state forward. States cannot go backward.

### State 1 — START

- **FR-13** The countdown timer runs live for all users.
- **FR-14** Any user (admin or guest) can click **"+ Add note"** in any column to create a note.
- **FR-15** Each note stores: text, author username, author color, column ID, timestamp.
- **FR-16** Note author can **edit** or **delete** their own note.
- **FR-17** **Admin** sees the full text of all notes from all users.
- **FR-18** **Guests** see only their own notes in full. Other users' notes appear as **skeleton blocks** — colored by the author's color, text hidden.
- **FR-19** The note count per column is visible to everyone.
- **FR-20** When the timer reaches 0, an alert notifies all users. Admin must manually advance the state.
- **FR-21** Admin can advance to `REVIEW` via a "Move to Review" button at any time.

### State 2 — REVIEW

- **FR-22** All notes are fully revealed to every user (text visible to all).
- **FR-23** Notes are read-only for guests.
- **FR-24** **Admin** can **drag notes onto each other** to create a group.
- **FR-25** Admin can **rename a group** by clicking its label.
- **FR-26** Admin can **drag a note out of a group** to ungroup it.
- **FR-27** Group changes are reflected in real time for all users.
- **FR-28** Admin advances to `DONE` via a "Move to Done" button.

### State 3 — DONE

- **FR-29** The board displays a full **session summary**: all columns, groups, and notes.
- **FR-30** **Admin** can add **action items** — a numbered free-text list.
- **FR-31** Action items are visible to all users in real time.
- **FR-32** Guests see the summary and action items in read-only mode.
- **FR-33** Admin can click **"Export PDF"** to download the session as a PDF file.

---

## 4. PDF Export

- **FR-34** PDF is generated on demand when admin clicks "Export PDF".
- **FR-35** PDF contains:
  - Session title (room ID + date)
  - All columns with their notes, organized by group where applicable
  - Each note shows: text + author color indicator
  - Action items as a numbered list at the end

---

## 5. Real-Time Sync

- **FR-36** All board changes (new notes, state transitions, groups, action items) sync in real time to all users in the room via WebSocket.
- **FR-37** When a new user joins mid-session, they receive the full current board state.

---

## 6. UI / Theme

- **FR-38** Default background color is `#FBF0D9` (warm off-white).
- **FR-39** Users can toggle between **light mode** (`#FBF0D9` base) and **dark mode** (`#0e0e10` base) via a button in the top bar.
- **FR-40** Theme preference is saved to `localStorage`.
- **FR-41** Each column is color-coded by its assigned color. Notes inherit the author's color as a left border.
- **FR-42** Top bar always shows: app logo, current board state, room ID, and user identity (crown icon for admin).

---

## 7. Out of Scope (v1)

- User accounts / authentication
- Multiple admins per room
- Voting on notes
- Room persistence after session ends
- Mobile-native app
