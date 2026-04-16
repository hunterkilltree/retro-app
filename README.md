# Retro App

A real-time retrospective board. Create a room, share the link, and run a structured retro session with your team — no login required.

---

## Prerequisites

| Tool | Version |
|------|---------|
| Java | 21+ |
| Node.js | 18+ |
| Docker | any recent version |

---

## Quick Start

### 1. Start the database

```bash
docker compose up -d
```

This starts a PostgreSQL 16 container on port `5432`. Data is persisted in `./docker-data/postgres`.

### 2. Start the backend

```bash
cd retro-server
./gradlew bootRun
```

Wait for:
```
Started RetroServerApplication in X seconds
```

The API runs on **http://localhost:8080**.

### 3. Start the frontend

Open a new terminal:

```bash
cd retro-fe
npm install   # first time only
npm run dev
```

The app runs on **http://localhost:3000**.

---

## How to Run a Retro

1. Open **http://localhost:3000** and click **Generate Room**
2. Share the URL with your team
3. First person in = admin; everyone else = guest
4. **SETUP** — Admin adds columns (e.g. Went Well / Needs Improvement / Actions) and sets a timer
5. **START** — Everyone writes notes; guests only see their own until review
6. **REVIEW** — All notes revealed; admin drags notes together to group them, clicks labels to rename groups, clicks ✕ to ungroup
7. **DONE** — Admin adds action items; anyone can export the full summary as a PDF

---

## Configuration

### Database credentials

Defaults (no setup needed for local dev):

| Setting | Value |
|---------|-------|
| Host | `localhost:5432` |
| Database | `retrodb` |
| Username | `retro` |
| Password | `retro_secret` |

Override via environment variables:

```bash
POSTGRES_DB=mydb POSTGRES_USER=me POSTGRES_PASSWORD=secret docker compose up -d
```

Then start the backend with matching vars:

```bash
POSTGRES_USER=me POSTGRES_PASSWORD=secret ./gradlew bootRun
```

### Backend URL (frontend)

The frontend proxies all API calls to `http://localhost:8080` by default. To point at a different backend:

```bash
# retro-fe/.env.local
BACKEND_URL=http://my-server:8080
```

---

## Project Structure

```
retro-app/
├── compose.yml          # PostgreSQL via Docker
├── retro-server/        # Java 21 + Spring Boot 4 backend
│   └── src/main/java/com/retro/
│       ├── controller/  # REST endpoints
│       ├── ws/          # WebSocket handlers (STOMP)
│       ├── service/     # Business logic + PDF export
│       ├── entity/      # JPA entities
│       └── repository/  # Spring Data repos
└── retro-fe/            # Next.js 15 frontend
    ├── app/             # App Router pages + API proxy routes
    ├── components/      # UI components (board, admin, ui)
    ├── store/           # Zustand store
    └── hooks/           # WebSocket + timer hooks
```

---

## Stopping the App

```bash
# Stop frontend — Ctrl+C in its terminal
# Stop backend — Ctrl+C in its terminal
# Stop database
docker compose down
```

To also delete all stored data:

```bash
docker compose down -v
rm -rf docker-data/
```
