# Multi-Container Application Stack: React + Node.js + PostgreSQL

## Overview

This project demonstrates how multiple isolated services can be built, connected, and run together as a single working application using containers. Each service runs in its own container with its own environment, yet they communicate over a shared network as if they were one system.

The objective is to understand how to define, build, and orchestrate a real three-tier application using Docker and Podman, covering custom image builds, container networking, volume persistence, service dependencies, and CI/CD automation — all skills that map directly to production DevOps workflows.

> Since this is a multi-tier container deployment, a Docker Compose file is used to build all the images, run the containers, create a shared network for inter-container communication, and provision a volume for data persistence — all from a single definition file, rather than managing three individual Dockerfiles and running each container separately by hand.

---

## Architecture

```
Browser → React/Nginx (port 3001) → Node.js/Express (internal) → PostgreSQL (internal)
```

The application follows a three-tier architecture:

| Tier | Technology | Role |
|---|---|---|
| Presentation | React + Nginx | UI the user sees and interacts with in the browser |
| Application | Node.js + Express | REST API that handles business logic and talks to the DB |
| Data | PostgreSQL | Stores and persists all application data |

---

## What Each Service Does

**Frontend (React + Nginx)**
The frontend is what the user sees and interacts with in the browser. React handles the UI logic: rendering notes, capturing user input, and making API calls to the backend. Nginx serves the compiled React files as static assets and acts as a reverse proxy, forwarding any `/api/` requests to the backend so the browser never communicates with the backend directly.

**Backend (Node.js + Express)**
The backend is the brain of the application. It receives HTTP requests from the frontend, applies business logic, and talks to the database to read or write data. It exposes a REST API with endpoints for checking system health, fetching notes, creating notes, and deleting them. It also handles database readiness by retrying the connection on startup.

**Database (PostgreSQL)**
The database is the persistence layer. It stores all notes in a table and responds to queries from the backend. It uses a named volume so that data survives container restarts and rebuilds. No custom image is needed — the official PostgreSQL image handles initialization through environment variables passed in at runtime.

---

## Project Structure

```
multi-container-app/
├── .github/
│   └── workflows/
│       └── cicd.yml             # GitHub Actions CI/CD pipeline
├── frontend/                    # Service directory — all code and build instructions for the React app
│   ├── .eslintrc.json           # ESLint rules for React and modern JSX
│   ├── Dockerfile               # or Containerfile (Podman) — multi-stage: Node builds, Nginx serves
│   ├── nginx.conf               # Serves React, proxies /api to backend
│   ├── index.html
│   ├── vite.config.js
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx              # Main React UI component
│   │   └── index.css
│   └── package.json             # Frontend dependencies, build and lint scripts
├── backend/                     # Service directory — all code and build instructions for the Node.js API
│   ├── __tests__/
│   │   └── api.test.js          # Jest and Supertest tests for all API endpoints
│   ├── .eslintrc.json           # ESLint rules for Node.js
│   ├── Dockerfile               # or Containerfile (Podman) — Node.js 20 Alpine
│   ├── app.js                   # Express app and all routes — exported for testing
│   ├── index.js                 # Server boot sequence — imports app from app.js
│   └── package.json             # Backend dependencies, start, test, and lint scripts
├── .trivyignore                 # CVEs excluded from Trivy scan — npm internals in Node.js base image
├── .gitignore
├── docker-compose.yml           # Builds and orchestrates all containers using Docker
├── podman-compose.yml           # Same as above but runs on the Podman runtime
└── README.md
```

> For custom application code, a Dockerfile is needed to define how the image should be built. For standard software like PostgreSQL, Docker Compose simply pulls the official pre-built image from Docker Hub — no Dockerfile required.

---

## Docker Hub Images

The custom images for this project are published to Docker Hub:

| Service | Image |
|---|---|
| Backend | `afokepeniel/multi-container-backend:latest` |
| Frontend | `afokepeniel/multi-container-frontend:latest` |

Each image is tagged with both `latest` and the Git commit SHA for traceability and rollback:
- `latest` — for easy pulling and deployment
- `abc1234` (commit SHA) — for traceability and rollback to a specific version

---

## CI/CD Pipeline

This project uses GitHub Actions for CI/CD, triggered on every push to `main`.

### Branching Strategy

```
dev → staging → main
```

- `dev` — active development and local testing
- `staging` — pre-production validation
- `main` — production, triggers the CI/CD pipeline

### Pipeline Flow

```
push to main
  → Run Automated Tests + upload test report artifact
    → Lint and Code Quality (ESLint — backend and frontend)
      → Scan Images for Vulnerabilities (Trivy)
        → Build and Push Images to Docker Hub (latest + commit SHA tags)
          → Deploy (pauses for manual approval via Production environment)
```

### Pipeline Optimizations

| Feature | Implementation |
|---|---|
| Automated Testing | Jest and Supertest — 8 tests covering all 4 API endpoints |
| Linting and Code Quality | ESLint for backend (.js) and frontend (.js, .jsx) |
| Image Vulnerability Scanning | Trivy scans both images before pushing — pipeline fails on CRITICAL or HIGH CVEs |
| Build Caching | GitHub Actions Cache via Docker Buildx — reuses unchanged layers across runs |
| Image Tagging Strategy | Both `latest` and commit SHA tags pushed on every run |
| Artifacts | Test results and scan reports uploaded to GitHub storage for 14 days |
| Environment Protection Rules | Manual approval gate on the Production environment before deploy runs |
| Notifications | GitHub email notifications on pipeline pass or fail |

### GitHub Secrets Required

| Secret | Value |
|---|---|
| `DOCKER_USERNAME` | your Docker Hub username |
| `DOCKER_PASSWORD` | your Docker Hub access token |

### GitHub Environment Required

A `Production` environment must be configured in repo Settings → Environments with a required reviewer assigned. The deploy job references this environment and pauses for approval before running.

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

## Getting Started

```bash
# Step 1 — Navigate into the project directory
cd multi-container/multi-container-app

# Step 2 — Log in to Docker Hub
docker login

# Step 3 — Create repositories on Docker Hub
# Go to hub.docker.com and create:
# afokepeniel/multi-container-backend
# afokepeniel/multi-container-frontend

# Step 4 — Build all images and start the containers
docker compose up -d --build

# Step 5 — Visit the app in your browser
# http://localhost:3001

# Step 6 — Tag the custom built images for Docker Hub
docker tag multi-container-app-backend afokepeniel/multi-container-backend:latest
docker tag multi-container-app-frontend afokepeniel/multi-container-frontend:latest

# Step 7 — Push the images to Docker Hub
# (db is skipped — it uses the official postgres:16 image from Docker Hub already)
docker push afokepeniel/multi-container-backend:latest
docker push afokepeniel/multi-container-frontend:latest

# Step 8 — Initialize a git repository
git init

# Step 9 — Stage all project files
git add .

# Step 10 — Commit with a descriptive message
git commit -m "initial: multi-container react + node + postgres stack"

# Step 11 — Point to your remote GitHub repository
git remote add origin https://github.com/AfokePeniel/Multi-Container-App.git

# Step 12 — Rename branch to main and push to GitHub
git branch -m master main
git push -u origin main

# Step 13 — Create the GitHub Actions workflow directory and pipeline file
mkdir -p .github/workflows
# Add cicd.yml inside .github/workflows/

# Step 14 — Add GitHub Secrets in your repository settings
# DOCKER_USERNAME — your Docker Hub username
# DOCKER_PASSWORD — your Docker Hub access token

# Step 15 — Create a Production environment in repo Settings → Environments
# Enable Required reviewers and add yourself

# Step 16 — Commit and push the pipeline file to trigger the CI/CD pipeline
git add .
git commit -m "add: github actions cicd pipeline"
git push origin main

# Step 17 — Verify the pipeline ran successfully in the GitHub Actions tab
# Approve the deploy job when prompted
```

### Podman Alternative

```bash
# Build and start
podman-compose -f podman-compose.yml up -d --build

# Tag and push images
podman tag multi-container-app-backend afokepeniel/multi-container-backend:latest
podman tag multi-container-app-frontend afokepeniel/multi-container-frontend:latest
podman push afokepeniel/multi-container-backend:latest
podman push afokepeniel/multi-container-frontend:latest
```

---

## Common Commands

| Action | Docker | Podman |
|---|---|---|
| Start stack | `docker compose up -d --build` | `podman-compose -f podman-compose.yml up -d --build` |
| Stop stack | `docker compose down` | `podman-compose -f podman-compose.yml down` |
| Stop and remove volumes | `docker compose down -v` | `podman-compose -f podman-compose.yml down -v` |
| View logs | `docker compose logs -f` | `podman-compose -f podman-compose.yml logs -f` |
| Shell into backend | `docker exec -it node_backend sh` | `podman exec -it node_backend sh` |
| Shell into DB | `docker exec -it pg_db psql -U appuser -d appdb` | `podman exec -it pg_db psql -U appuser -d appdb` |
| List running containers | `docker ps` | `podman ps` |
| Inspect network | `docker network inspect multi-container-app_app_network` | `podman network inspect multi-container-app_app_network` |

---

## API Endpoints

The backend runs internally on port 5000 and is proxied through Nginx at `/api/`.

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Health check — confirms backend and DB connection |
| GET | `/api/notes` | Retrieve all notes |
| POST | `/api/notes` | Create a note `{ "content": "..." }` |
| DELETE | `/api/notes/:id` | Delete a note by ID |

---

## Key Concepts Demonstrated

**Container Networking**
All containers share `app_network`. Docker/Podman DNS resolves container names as hostnames, so the backend connects to `db:5432` and Nginx proxies to `http://node_backend:5000` — no IP addresses needed. Only the frontend is exposed to the host on port `3001`.

**Multi-Stage Build**
The frontend Dockerfile uses two stages: a Node.js stage to compile the React app, and an Nginx stage to serve only the compiled output. The final image contains no Node.js or source code, keeping it small and production-safe.

**Volume Persistence**
`pg_data` is a named volume mounted into the PostgreSQL container. Data survives container restarts and rebuilds and is only removed when you explicitly run `docker compose down -v`.

**DB Readiness Handling**
The backend retries the database connection up to 10 times on startup with a 2-second delay between attempts. This compensates for the fact that PostgreSQL takes a moment to be ready even after its container starts.

**App and Server Separation**
The backend is split into `app.js` (Express app and routes) and `index.js` (server boot sequence). This separation allows Jest and Supertest to import the app without starting the server, which is the standard Node.js testing pattern.

---

## Docker vs Podman

| Feature | Docker | Podman |
|---|---|---|
| Daemon | Requires dockerd | Daemonless |
| Default user | Runs as root | Rootless by default |
| Build file | `Dockerfile` | `Containerfile` (also reads `Dockerfile`) |
| Volume location | `/var/lib/docker/volumes/` | `~/.local/share/containers/storage/volumes/` |
| Network backend | Docker bridge | Netavark |
| `service_healthy` condition | Fully supported | May vary by podman-compose version |
| Host ports below 1024 | Works by default | Requires `sysctl net.ipv4.ip_unprivileged_port_start=80` |

---

## Troubleshooting

**Port already in use:**
```bash
sudo ss -tlnp | grep 3001
sudo fuser -k 3001/tcp
```

**Backend cannot reach the DB:**
```bash
docker inspect pg_db | grep -A5 Health
docker exec -it node_backend sh
```

**Reset everything:**
```bash
docker compose down -v --rmi all
docker compose up -d --build
```