# VetJobs

Find real, scam-free Nigerian jobs and auto-apply with the right CV. A monorepo
with a Next.js frontend and a NestJS + PostgreSQL backend.

## Structure
```
vetjobs/
├── vetjobs-app/      Next.js frontend (UI, public job feed + scam checker, auth-gated apply/profile/stats)
├── vetjobs-api/      NestJS backend (auth, Postgres, jobs, verification, AI cover letters)
├── k8s/              Kubernetes manifests
├── docker-compose.yml   full local stack (db + api + web)
├── render.yaml       one-click deploy to Render
├── DEPLOY.md         Docker & Kubernetes guide
└── RENDER.md         deploy to Render (test live, no localhost)
```

## Quick start (local, Docker)
```bash
docker compose up --build
# web → http://localhost:3000   api → http://localhost:4000/api
```

## Run without Docker
```bash
# backend
cd vetjobs-api && cp .env.example .env && npm install && npm run start:dev
# frontend (new terminal)
cd vetjobs-app && npm install && npm run dev
```

## Deploy
- **Render (easiest):** see `RENDER.md`.
- **Kubernetes:** see `DEPLOY.md`.

## What's public vs gated
- Public, no account: the **job feed** and the **scam checker**.
- Account required: **auto-apply**, **profile/CVs**, and the **dashboard**.

See each app's own `README.md` for details.
