# Retro App — Frontend Rules (Next.js)

> **Scope:** everything inside `retro-fe/`. For real-time message contracts read `../.claude/websocket.md`.

---

## Project Structure

```
retro-fe/
├── app/
│   ├── layout.tsx          # Root layout with providers
│   ├── page.tsx            # Landing page (Generate Room)
│   └── [roomId]/
│       └── page.tsx        # Room page (all board states)
├── components/
│   ├── board/              # Board, Column, Note, NoteGroup
│   ├── admin/              # Admin-only: Setup, ActionItems, GroupControls
│   └── ui/                 # Shared: Button, Avatar, Timer, ThemeToggle
├── hooks/                  # useWebSocket, useRoom, useTimer
├── lib/                    # Utilities, API client, WebSocket client
├── stores/                 # Zustand stores (room, board, user)
├── types/                  # Shared TypeScript types and enums
└── styles/                 # Global CSS variables and theme
```

---

## React / Next.js Patterns

- Use **Server Components** by default; add `"use client"` only when hooks or interactivity are needed.
- State management with **Zustand** — one store per domain concern: `room`, `board`, `user`.
- All TypeScript types go in `types/` and must mirror the backend domain model exactly.
- Use `enum BoardState { SETUP, START, REVIEW, DONE }` — matches the backend enum name for name.
- Props interfaces defined directly above each component, name suffixed with `Props` (e.g. `NoteCardProps`).
- Conditional rendering based on `user.role` (`ADMIN` vs `GUEST`) — never duplicate entire pages.
- Drag-and-drop in `REVIEW` state: use `@dnd-kit/core` for note grouping only.
- The `Timer` component receives `endTime` (ISO string) from the server and counts down locally.

---

## Guest / Skeleton Notes

- In `START` state, guests see only their own notes.
- Render `<SkeletonNote color={authorColor} />` for every note that belongs to another participant.
- Skeleton notes must have the same shape (height, padding, border) as real notes; use a shimmer `@keyframes` animation.

---

## WebSocket Client

- Connect via SockJS + STOMP to `ws://<backend>/ws`.
- Subscribe to `/topic/room/{roomId}` for server broadcasts.
- Send actions to `/app/room/{roomId}/*` destinations.
- One connection per room session — manage in a `useWebSocket` hook or Zustand middleware.
- On receiving a room snapshot, **replace** the entire room store (never merge).
- Optimistic UI only for the current user's own note creation — revert immediately if the server rejects.
- On disconnect: show a reconnecting banner and retry with exponential backoff: 1 s → 2 s → 4 s → max 30 s.

---

## UI & Styling

### Fonts

| Usage | Font |
|-------|------|
| Body text | **DM Sans** |
| Headings, logo, timer | **DM Serif Display** |

### Theme Tokens (CSS Custom Properties)

| Token       | Light     | Dark      |
|-------------|-----------|-----------|
| `--bg`      | `#FBF0D9` | `#0e0e10` |
| `--surface` | `#fff`    | `#18181c` |
| `--text`    | `#1e1a14` | `#f0ede8` |
| `--accent`  | `#b8820a` | `#e8b86d` |
| `--accent2` | `#5a48d4` | `#7c6af5` |
| `--green`   | `#2d8c5e` | `#4caf80` |
| `--red`     | `#c94040` | `#e06060` |

- Toggle via `data-mode="light|dark"` on the root `<html>` element. Persist in `localStorage`.
- **Never hardcode hex values** in components — always use CSS custom properties.

### Component Styling Rules

- Use **CSS Modules** (`.module.css`) for all component-scoped styles.
- Global theme variables live in `styles/globals.css`.
- Border radius: `6–9px` for cards/panels; `20px` for pills and avatar circles.
- Transitions: `0.25s` for theme switches; `0.15s` for hover states.
- Notes: `3px solid` colored left border using the author's `color` value. Background is an `rgba()` tint of the column color.
- Admin badge: amber pill with `👑` prefix. Participant pill: avatar circle + username.
- Board columns: `flex: 1`, `min-width: 180px`, horizontal scroll on overflow.
- Mobile is out of scope for v1 — keep layouts flex-based for future adaptation.
