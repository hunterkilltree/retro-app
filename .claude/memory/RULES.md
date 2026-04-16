# Project Rules for Claude

## Commit discipline — ONE feature, ONE commit

Every time a small, testable feature is completed, commit immediately before starting the next one.

**Rule:** `1 feature = 1 commit`. Never batch multiple features into one commit.

**Workflow:**
1. Implement one small feature (e.g. "REVIEW board reveals all notes")
2. TypeScript check passes
3. Tell the user what to test
4. **Commit that feature right away**
5. Ask the user if they're ready for the next step
6. Only then start the next feature

**Commit message format (conventional commits):**
```
feat: <short description of the single feature>

- bullet of what changed on backend (if any)
- bullet of what changed on frontend (if any)

Covers FR-XX
```

**Examples of correctly scoped commits:**
- `feat: TopBar with room code copy and theme toggle (FR-06, FR-39, FR-40, FR-42)`
- `feat: column builder with drag-to-reorder in SETUP state (FR-08, FR-09)`
- `feat: live countdown timer in START state (FR-13, FR-20)`
- `feat: note creation via WebSocket in START state (FR-14, FR-15)`
- `feat: note edit and delete for note author (FR-16)`

**What NOT to do:**
- Do not implement 3 phases and then commit everything at once
- Do not move to the next feature before committing the current one
- Do not mix backend and frontend features from different FRs in one commit

---

## Step size

Each step should be small enough that the user can test it as a client in under 2 minutes.

After each step:
1. State clearly what the user can test
2. Wait for the user to say "next" or "continue"
3. Do not start the next step until confirmed
