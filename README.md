# Retro App

A real-time retrospective board. Create a room, share the link, and run a structured retro session with your team — no login required.

🚀 **Live app:** https://retro-frontend.onrender.com

---

## Prerequisites

| Tool | Version |
|------|---------|
| Java | 21+ |
| Node.js | 18+ |
| Docker | any recent version |

---

## Quick Start (local dev — no Docker)

### 1. Start the database

```bash
docker compose up -d postgres
```

### 2. Start the backend

```bash
cd retro-server
./gradlew bootRun
```

Wait for `Started RetroServerApplication` — API runs on **http://localhost:8080**.

### 3. Start the frontend

```bash
cd retro-fe
npm install   # first time only
npm run dev
```

App runs on **http://localhost:3000**.

---

## Quick Start (local — full Docker)

Build and run all three services with one command:

```bash
docker compose up --build
```

App runs on **http://localhost:3000**. Logs stream to the terminal.

To run in background:

```bash
docker compose up --build -d
docker compose logs -f   # tail logs
docker compose down      # stop everything
```

---

## How to Run a Retro

1. Open **http://localhost:3000** → click **Generate Room**
2. Share the URL with your team
3. First person in = admin; everyone else = guest
4. **SETUP** — Admin adds columns and sets a timer
5. **START** — Everyone writes notes; guests only see their own
6. **REVIEW** — All notes revealed; admin groups, renames, ungroups notes
7. **DONE** — Admin adds action items; anyone can export a PDF summary

---

## Docker Images

### Build images

```bash
# Backend
docker build -t your-dockerhub-username/retro-backend:latest ./retro-server

# Frontend (bake in the production backend URL)
docker build \
  --build-arg BACKEND_URL=https://your-backend.onrender.com \
  -t your-dockerhub-username/retro-frontend:latest \
  ./retro-fe
```

### Push to Docker Hub

```bash
docker login

docker push your-dockerhub-username/retro-backend:latest
docker push your-dockerhub-username/retro-frontend:latest
```

### Image size targets

| Image | Strategy | Expected size |
|-------|----------|---------------|
| `postgres:16-alpine` | official Alpine | ~80 MB |
| `retro-backend` | multi-stage, JRE-only Alpine | ~180 MB |
| `retro-frontend` | multi-stage, standalone output | ~150 MB |

**What keeps images small:**
- **Alpine base** — `eclipse-temurin:21-jre-alpine` and `node:22-alpine` instead of Debian/Ubuntu variants
- **Multi-stage builds** — build tools (Gradle, npm dev deps) never reach the final image
- **JRE not JDK** — runtime-only Java, no compiler or javadoc
- **Next.js standalone** — `output: "standalone"` in `next.config.ts` copies only what's needed to run, skipping the full `node_modules` tree
- **Spring Boot layers** — JAR is split into dependency/application layers so Docker reuses the large dependencies layer on every push

---

## Deploy on Render (free tier)

Render gives you one free PostgreSQL database and multiple free web services.

### 1. Database — use Render's managed PostgreSQL

In the Render dashboard → **New → PostgreSQL**. After creation, copy the **Internal Database URL** — it looks like:

```
postgresql://user:password@dpg-xxx.oregon-postgres.render.com/retrodb
```

### 2. Backend web service

**New → Web Service → Deploy an existing image**

| Setting | Value |
|---------|-------|
| Image | `your-dockerhub-username/retro-backend:latest` |
| Port | `8080` |

Add these **environment variables**:

| Key | Value |
|-----|-------|
| `SPRING_DATASOURCE_URL` | `jdbc:postgresql://dpg-xxx.oregon-postgres.render.com/retrodb` |
| `SPRING_DATASOURCE_USERNAME` | *(from Render DB page)* |
| `SPRING_DATASOURCE_PASSWORD` | *(from Render DB page)* |

After deploy, copy the service URL — e.g. `https://retro-backend-xxxx.onrender.com`.

### 3. Rebuild frontend image with production backend URL

```bash
docker build \
  --build-arg BACKEND_URL=https://retro-backend-xxxx.onrender.com \
  -t your-dockerhub-username/retro-frontend:latest \
  ./retro-fe

docker push your-dockerhub-username/retro-frontend:latest
```

### 4. Frontend web service

**New → Web Service → Deploy an existing image**

| Setting | Value |
|---------|-------|
| Image | `your-dockerhub-username/retro-frontend:latest` |
| Port | `3000` |

Add this **environment variable**:

| Key | Value |
|-----|-------|
| `BACKEND_URL` | `https://retro-backend-xxxx.onrender.com` |

Once deployed, your app is live at the frontend service URL.

### Free tier notes

- Web services **spin down after 15 minutes of inactivity** — first request after idle takes ~30 seconds to wake up
- Free PostgreSQL databases **expire after 90 days** — export your data before then
- Both services must allow CORS from each other; the current backend accepts all origins on WebSocket connections

---

## Configuration Reference

### Backend environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SPRING_DATASOURCE_URL` | `jdbc:postgresql://localhost:5432/retrodb` | JDBC connection string |
| `SPRING_DATASOURCE_USERNAME` | `retro` | DB username |
| `SPRING_DATASOURCE_PASSWORD` | `retro_secret` | DB password |
| `SERVER_PORT` | `8080` | HTTP port |

### Frontend environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `BACKEND_URL` | `http://localhost:8080` | Base URL for server-side API proxy calls |
| `PORT` | `3000` | HTTP port |

---

## Project Structure

```
retro-app/
├── compose.yml            # Docker Compose (all 3 services)
├── retro-server/          # Java 21 + Spring Boot 4 backend
│   ├── Dockerfile
│   ├── .dockerignore
│   └── src/main/java/com/retro/
│       ├── controller/    # REST endpoints
│       ├── ws/            # WebSocket handlers (STOMP)
│       ├── service/       # Business logic + PDF export
│       ├── entity/        # JPA entities
│       └── repository/    # Spring Data repos
└── retro-fe/              # Next.js 15 frontend
    ├── Dockerfile
    ├── .dockerignore
    ├── next.config.ts     # standalone output enabled
    ├── app/               # App Router pages + API proxy routes
    ├── components/        # UI components
    ├── store/             # Zustand store
    └── hooks/             # WebSocket + timer hooks
```

---

## Stopping / Cleanup

```bash
docker compose down          # stop containers, keep data
docker compose down -v       # stop + delete volumes
rm -rf docker-data/          # delete persisted DB data
```
