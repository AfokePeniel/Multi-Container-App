# Multi-Container App: React + Node.js + PostgreSQL

A three-tier containerized application demonstrating multi-container orchestration with Docker and Podman.

```
Browser → React (Nginx) → Node.js (Express) → PostgreSQL
           port 3000        internal only        internal only
```

---

## Project Structure

```
multi-container-app/
├── frontend/
│   ├── Dockerfile          # Multi-stage: Node (build) → Nginx (serve)
│   ├── nginx.conf          # Serves React, proxies /api to backend
│   ├── vite.config.js
│   ├── index.html
│   └── src/
│       ├── main.jsx
│       ├── App.jsx         # Notes CRUD app
│       └── index.css
├── backend/
│   ├── Dockerfile          # Node.js 20 Alpine
│   ├── index.js            # Express API with retry DB connection
│   └── package.json
├── docker-compose.yml      # Docker Compose (uses service_healthy condition)
├── podman-compose.yml      # Podman Compose (compatible with older podman-compose)
└── README.md
```

---

## Prerequisites

**Docker:**
```bash
docker --version          # Docker 24+
docker compose version    # Compose v2
```

**Podman:**
```bash
podman --version          # Podman 4+
pip install podman-compose
podman-compose --version
```

---

## Quick Start

### Docker

```bash
# Clone the repo
git clone <your-repo-url>
cd multi-container-app

# Build images and start all containers in detached mode
docker compose up -d --build

# View logs across all containers
docker compose logs -f

# Open the app
open http://localhost:3000
```

### Podman

```bash
git clone <your-repo-url>
cd multi-container-app

podman-compose -f podman-compose.yml up -d --build

podman-compose -f podman-compose.yml logs -f

open http://localhost:3000
```

---

## Common Commands

| Action | Docker | Podman |
|---|---|---|
| Start stack | `docker compose up -d --build` | `podman-compose -f podman-compose.yml up -d --build` |
| Stop stack | `docker compose down` | `podman-compose -f podman-compose.yml down` |
| Stop + delete volumes | `docker compose down -v` | `podman-compose -f podman-compose.yml down -v` |
| View all logs | `docker compose logs -f` | `podman-compose -f podman-compose.yml logs -f` |
| Shell into backend | `docker exec -it node_backend sh` | `podman exec -it node_backend sh` |
| Shell into DB | `docker exec -it pg_db psql -U appuser -d appdb` | `podman exec -it pg_db psql -U appuser -d appdb` |
| List running containers | `docker ps` | `podman ps` |
| Inspect network | `docker network inspect multi-container-app_app_network` | `podman network inspect multi-container-app_app_network` |

---

## API Endpoints

The backend API is available internally on port 5000 and proxied through Nginx at `/api/`.

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Health check — confirms DB connection |
| GET | `/api/notes` | Retrieve all notes |
| POST | `/api/notes` | Create a note `{ "content": "..." }` |
| DELETE | `/api/notes/:id` | Delete a note by ID |

---

## Key Concepts Demonstrated

### Container Networking
All containers share `app_network`. Docker/Podman DNS lets them find each other by `container_name`:
- Backend connects to `db:5432`
- Nginx proxies `http://node_backend:5000`
- Only `react_frontend` is exposed to the host on port `3000`

### Multi-Stage Build (Frontend)
The frontend Dockerfile has two stages:
1. **builder** (node:20-alpine) — installs deps and compiles React via Vite
2. **Final** (nginx:alpine) — copies only the `/dist` output; no Node.js in the final image

This keeps the image small and contains no source code in production.

### Volume Persistence
`pg_data` is a named volume mounted at `/var/lib/postgresql/data`. Data survives container removal — only `docker compose down -v` deletes it.

### DB Readiness
The backend includes a `connectWithRetry()` function that retries the DB connection up to 10 times with a 2-second delay. This is important for Podman where `depends_on: condition: service_healthy` is not always respected.

---

## Docker vs Podman Differences

| Feature | Docker | Podman |
|---|---|---|
| Daemon | Requires dockerd | Daemonless |
| Root | Runs as root by default | Rootless by default |
| Build file | `Dockerfile` | `Containerfile` (also reads `Dockerfile`) |
| Volume location | `/var/lib/docker/volumes/` | `~/.local/share/containers/storage/volumes/` |
| Network backend | Docker bridge | Netavark (or CNI on older versions) |
| `service_healthy` in compose | Fully supported | May require newer podman-compose version |
| Ports below 1024 on host | Works by default | Requires `sysctl net.ipv4.ip_unprivileged_port_start=80` |

---

## Troubleshooting

**Backend cannot reach DB:**
```bash
# Check DB is healthy
docker inspect pg_db | grep -A5 Health

# Manually test connection from backend container
docker exec -it node_backend sh
# Inside: node -e "require('pg').Pool({host:'db',user:'appuser',password:'apppassword',database:'appdb'}).query('SELECT 1').then(console.log)"
```

**Port 3000 already in use:**
Change the host port in compose: `"3001:80"` then access `http://localhost:3001`

**Podman: cannot bind port:**
```bash
sudo sysctl net.ipv4.ip_unprivileged_port_start=80
```

**Reset everything:**
```bash
docker compose down -v --rmi all
docker compose up -d --build
```
