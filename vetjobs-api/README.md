# VetJobs API — NestJS + PostgreSQL

The backend for VetJobs. NestJS (TypeScript) with a PostgreSQL database (TypeORM).
Runs alongside the `vetjobs-app` Next.js frontend.

## Run it

You need **Node 18.18+**. You also need a **Postgres** database — pick one:

**Option A — local Postgres with Docker (easiest):**
```bash
docker compose up -d         # starts Postgres on localhost:5432
```

**Option B — free hosted Postgres:** create a free DB at Neon, Supabase, or Railway and copy its connection URL.

Then:
```bash
cd vetjobs-api
cp .env.example .env         # then edit .env (set DATABASE_URL if using hosted)
npm install
npm run start:dev            # API on http://localhost:4000/api
```

On first run TypeORM auto-creates the tables (`synchronize: true`, dev only).

## Endpoints (all under `/api`)

| Method | Path | Purpose |
|---|---|---|
| GET | `/jobs` | Live + seeded jobs, each scored by the verification engine |
| POST | `/verify` | `{text,email?,company?}` → scam score + reasons |
| POST | `/cover-letter` | `{profile,role,job,cvText}` → application-grade letter (`source: ai \| builtin`) |
| POST | `/users` | `{email,name?}` → create or fetch a user |
| GET | `/users/:id` | User with roles + applications |
| PATCH | `/users/:id` | Update personal details + answers, plan, etc. |
| GET / POST | `/users/:id/roles` | List / add target roles (with CV text) |
| PATCH / DELETE | `/roles/:id` | Update / remove a role |
| GET / POST | `/users/:id/applications` | List / record applications |

## Database tables

- **users** — profile, `answers` (jsonb), subscription/trial fields, referrals, dodged count.
- **roles** — target roles, each with skills + CV text, linked to a user.
- **applications** — every application: job, company, CV used, status, generated letter, timestamp.

## Cover letters

`POST /api/cover-letter` returns a tailored letter. Set `OPENAI_API_KEY` in `.env` to get a fully
AI-written letter (model via `OPENAI_MODEL`); with no key it uses the built-in generator, which
mines the CV for a real achievement and the job for matched skills. Both are grounded in the
candidate's actual CV — no templates.

## What's next (roadmap)

- **Wire the frontend to this API** (replace the Next.js localStorage state + `/api/jobs` with calls here).
- **Auth**: add email+password / JWT (currently identity is email-based, no password — dev simplicity).
- **More job sources** in `jobs.service.ts` (Telegram, more boards, employer posting).
- **Company verification** (CAC + email-domain + LinkedIn) feeding `companyKnown`.
- **Paystack** payments for subscriptions.
- Switch `synchronize` off and use **migrations** for production.

## Project layout
```
src/
  main.ts, app.module.ts
  entities/        user, role, application
  users/ roles/ applications/    CRUD modules
  jobs/            live ingestion + verification
  verify/          scam engine + endpoint
  cover-letter/    letter builder (+ optional OpenAI)
docker-compose.yml   local Postgres
```
