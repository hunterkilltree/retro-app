# Retro App — WebSocket & Real-Time Contract

> **Shared rule.** Read this file whenever you are adding or changing WebSocket behaviour on either the frontend (`retro-fe/`) or the backend (`retro-server/`).

---

## Protocol

- **STOMP over SockJS** on both sides.
- Backend: `@EnableWebSocketMessageBroker` in Spring Boot.
- Frontend: `@stomp/stompjs` + `sockjs-client`.
- SockJS endpoint: `/ws`.
- Broker topic prefix: `/topic`.
- App (inbound) prefix: `/app`.

---

## Message Flow

```
Client                          Server
  |                               |
  |------ CONNECT /ws ---------->|
  |<----- room snapshot ----------|  (on @SubscribeMapping)
  |                               |
  |------ /app/room/{id}/addNote >|
  |       (server validates)      |
  |<----- room snapshot ----------|  broadcast to /topic/room/{id}
  |                               |
```

1. Client connects and subscribes → server immediately sends the full current room snapshot.
2. Client sends an action → server validates, mutates DB state, broadcasts updated snapshot to **all** clients in the room.
3. All clients receive the snapshot and **replace** (not merge) their local state — server is the single source of truth.

---

## Inbound Messages (client → server)

| Message type     | Payload fields (summary) | Admin only? |
|------------------|--------------------------|-------------|
| `AddNote`        | `columnId`, `content`    | No |
| `EditNote`       | `noteId`, `content`      | No (own notes only) |
| `DeleteNote`     | `noteId`                 | No (own notes only) |
| `GroupNotes`     | `noteIds[]`, `groupName` | Yes |
| `UngroupNote`    | `noteId`                 | Yes |
| `RenameGroup`    | `groupId`, `name`        | Yes |
| `AddActionItem`  | `content`                | Yes |
| `AdvanceState`   | —                        | Yes |

All messages are sent to `/app/room/{roomId}/<messageType camelCase>`.

---

## Outbound Messages (server → clients)

- **Single message type:** full room state snapshot.
- Destination: `/topic/room/{roomId}`.
- Sent after **every** mutation — keeps client logic simple (no partial-patch handling).
- The snapshot includes: room metadata, state, timer endTime, participants, columns, notes (with group info), note groups, and action items.

---

## Backend Rules

- `WebSocketConfig` must register STOMP endpoints with allowed origins matching the deployed frontend URL (configurable via env var).
- Use `SimpMessagingTemplate.convertAndSend("/topic/room/{roomId}", snapshot)` for all broadcasts.
- Track connected users per room via `SessionConnectEvent` / `SessionDisconnectEvent` listeners.
- New subscriber mid-session receives the full room state via `@SubscribeMapping`.
- **Always validate** the sender's role server-side before executing admin-only actions — never trust the client.
- Identify users by mapping WebSocket session ID → room participant record.

---

## Frontend Rules

- Maintain **one** WebSocket connection per room session — manage it in a `useWebSocket` hook or Zustand middleware.
- On receiving a snapshot: call the Zustand setter that **replaces** the entire room store.
- Optimistic UI: only for the current user's own note creation. Revert immediately on server rejection.
- On disconnect: display a "Reconnecting…" banner and retry with exponential backoff:
  - Delays: 1 s → 2 s → 4 s → … → max 30 s.
  - Reset backoff counter on successful reconnect.
