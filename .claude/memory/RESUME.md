# How to Resume This Project

## Step 1 — Read these files in order
1. `retro-app/CLAUDE.md` — monorepo overview, DB schema, board states
2. `retro-app/.claude/memory/PROGRESS.md` — implementation status per FR
3. `retro-app/retro-fe/CLAUDE.md` — frontend conventions
4. `retro-app/retro-server/CLAUDE.md` — backend conventions
5. `retro-app/.claude/websocket.md` — WS message contracts (if doing WS work)

## Step 2 — Find the first TODO
Look in PROGRESS.md for the first row marked `🔲 TODO`. That's where to start.

## Step 3 — Implementation order per phase
Always do **backend first** (entity/repo/controller/WS event), then **frontend** (API proxy → store → UI component), then verify the two sides connect.

## Step 4 — Update PROGRESS.md
After completing each FR, change its status from `🔲 TODO` → `✅ DONE` and add a short note about what files were created/changed. Update the "Next Session — Pick Up Here" section at the bottom.

---

## Current Status Snapshot (as of 2026-04-15)

**Done:** FR-01, FR-02, FR-03, FR-04, FR-05, FR-37 (6 of 42)
**Remaining:** 36 FRs
**Next up:** FR-06 (top bar + copy URL) → FR-07 through FR-12 (SETUP state)
