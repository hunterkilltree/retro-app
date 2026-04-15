# Retro App — Backend Rules (Spring Boot)

> **Scope:** everything inside `retro-server/`. For real-time message contracts read `../.claude/websocket.md`.

---

## Project Structure

```
retro-server/src/main/java/com/retro/
├── config/        # WebSocket, CORS, Jackson, DataSource / JPA config
├── controller/    # REST controllers (RoomController)
├── ws/            # WebSocket message handlers (@MessageMapping)
├── entity/        # JPA entities mapped to PostgreSQL tables
├── repository/    # Spring Data JPA repositories
├── dto/           # Request / Response DTOs
├── service/       # Business logic (RoomService, NoteService, …)
├── exception/     # Custom exceptions + global @ControllerAdvice handler
└── util/          # Room code generator, PDF builder
```

---

## Spring Boot Conventions

- Java 21, Spring Boot 4.0.3 (use Spring Boot 3.x APIs where 4.x is not explicit).
- Build tool: Gradle (see `build.gradle` in project root of `retro-server/`).
- **DTOs for everything** — never expose JPA entities directly over REST or WebSocket.
- Use `@MessageMapping` for STOMP WebSocket handlers; broadcast via `SimpMessagingTemplate`.
- REST surface is intentionally tiny:
  - `POST /api/rooms` — create a new room
  - `GET  /api/rooms/{id}/export` — PDF export

### Exception Hierarchy

| Exception | When to throw |
|-----------|---------------|
| `RoomNotFoundException` | Room code / ID not found |
| `UnauthorizedActionException` | Non-admin attempts an admin-only action |
| `InvalidStateTransitionException` | Illegal board-state jump |

- A global `@ControllerAdvice` maps these to appropriate HTTP status codes and WebSocket error frames.

---

## JPA / Entity Conventions

- All PKs are `UUID` — use `@GeneratedValue(strategy = GenerationType.UUID)`.
- Entity class names are **singular** (e.g. `Room`, `Note`, `Participant`, `BoardColumn`).
- Repositories extend `JpaRepository<Entity, UUID>`; add custom methods only as needed.
- `@Transactional` on every service method that performs writes.
- Default fetch type: `FetchType.LAZY` for all `@ManyToOne` / `@OneToMany`.
- Column naming handled automatically by `CamelCaseToUnderscoresNamingStrategy` (Spring default).
- `notes.group_id` is nullable — ungrouped notes have `group_id = NULL`.

### JPA Entity Example

```java
@Entity
@Table(name = "board_columns")
public class BoardColumn {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_id", nullable = false)
    private Room room;
}
```

---

## Database Connection

| Environment | JDBC URL |
|-------------|----------|
| Local dev   | `jdbc:postgresql://localhost:5432/retro_db` (no TLS) |
| Production  | `jdbc:postgresql://<host>:5432/retro_db?sslmode=require` |

- Connection pool via HikariCP (Spring Boot default).
- Config in `application.yml` — **never commit credentials**; use env vars or Spring profiles.
- `spring.jpa.hibernate.ddl-auto=validate` in production; never `update`.

---

## Flyway Migrations

- Versioned SQL scripts in `resources/db/migration/`.
- Naming: `V1__create_rooms.sql`, `V2__create_participants.sql`, etc.
- Always write a new migration file for schema changes — never edit existing ones.

### Schema Conventions

- Table names: lowercase `snake_case`, plural (e.g. `board_columns`, `note_groups`).
- Column names: lowercase `snake_case` (e.g. `room_id`, `timer_started_at`).
- FK column naming: `<referenced_table_singular>_id` (e.g. `room_id`, `column_id`, `participant_id`).
- Ordering field: `position` (integer) on columns, notes, groups, and action items.
- Timestamps: `created_at` on all tables; `notes` also has `updated_at`.

---

## Board State Machine (server-enforced)

`SETUP → START → REVIEW → DONE` — transitions are forward-only and validated server-side.

- Timer `endTime` is computed server-side as `Instant.now().plus(duration)` and broadcast to all clients.
- Admin-only actions: advance state, group notes, rename groups, add action items.
- Always verify the sender's role before executing any admin action.

---

## Query Best Practices

- Prefer Spring Data derived query methods or `@Query` with JPQL.
- Use `@Query(nativeQuery = true)` only for complex bulk operations.
- When building a WebSocket room snapshot, load all room data in a **single optimised query** to avoid N+1.
