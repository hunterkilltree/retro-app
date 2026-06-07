# End-to-end tests (Playwright)

Full-stack E2E tests that drive the real app: the Next.js frontend proxying to
the Spring Boot backend and Postgres. They cover the core retro happy path
(admin + guest, with real-time WebSocket sync), deleting a room, and PDF export.

## Prerequisites

The whole stack must be reachable before running the tests.

**Option A — Docker (everything):**

```bash
# from the repo root
docker compose up --build      # frontend :3000, backend :8080, postgres :5432
```

**Option B — local dev:**

```bash
docker compose up -d postgres          # database
cd retro-server && ./gradlew bootRun   # backend on :8080
cd retro-fe && npm run dev             # frontend on :3000
```

> If the frontend isn't already running, Playwright will start `npm run dev`
> for you (see `webServer` in `playwright.config.ts`). The **backend and
> database are not auto-started** — bring them up with one of the options above.

## One-time setup

```bash
cd retro-fe
npm install                 # installs @playwright/test
npx playwright install chromium
```

## Running

```bash
npm run test:e2e            # headless run
npm run test:e2e:ui         # interactive UI mode
npm run test:e2e:report     # open the last HTML report
```

Point the tests at a different URL with `PLAYWRIGHT_BASE_URL`
(and `BACKEND_URL` if Playwright is starting the dev server), e.g.:

```bash
PLAYWRIGHT_BASE_URL=http://localhost:3000 npm run test:e2e
```

## Layout

| File | What it covers |
|------|----------------|
| `helpers.ts` | Reusable flow helpers (create/join room, setup, start, notes, advance state). |
| `core-happy-path.spec.ts` | Admin + guest run a retro from setup → write → review → vote → done, asserting real-time sync. |
| `delete-room.spec.ts` | Admin deletes from the Done screen; the guest is redirected via the `ROOM_CLOSED` broadcast. Guests have no delete control. |
| `pdf-export.spec.ts` | Export PDF on Done downloads a `.pdf`. |

## Notes

- Each test creates its own fresh room, so they're isolated and safe to run in
  parallel. Rooms are short-lived test data; no cleanup step is required (the
  delete-room test removes its own room).
- Selectors use visible text / placeholders / roles rather than CSS-module class
  names (which are hashed at build time), so they survive styling changes.
- The first participant to join a room becomes the **admin**; everyone after is a
  **guest**. Helpers join the admin before the guest to keep roles deterministic.
