# VetJobs NG — real app (Next.js)

This is the **production-track** build of VetJobs: a real Next.js project with a
backend, a live job feed, and the verification engine as shared server code.
(The single-file `vetjobs/index.html` prototype still exists for quick demos.)

---

## Run it on your computer

You need **Node.js 18.18+** installed ([nodejs.org](https://nodejs.org)). Then:

```bash
cd vetjobs-app
npm install        # downloads dependencies (needs internet)
npm run dev        # starts the app
```

Open **http://localhost:3000**. Resize the window — it's responsive (mobile bottom-nav ↔ desktop sidebar).

To make a production build / deploy:

```bash
npm run build && npm start
```

Easiest deploy: push to GitHub and import the repo at [vercel.com](https://vercel.com) (free). It auto-builds Next.js.

---

## What's REAL in this build

- **Live job feed.** `app/api/jobs/route.js` calls `lib/source.js`, which fetches real
  openings from the **Arbeitnow public API** (no key needed), normalises them, runs the
  verification engine on each, de-dupes, and sorts freshest-first. A few seeded Nigerian
  examples (incl. scams) are always mixed in so the verifier visibly catches fraud.
  *(In the offline sandbox it falls back to seeded data; on your machine you'll see live jobs.)*
- **Verification engine** (`lib/verify.js`) — runs server-side and client-side. Research-informed
  signals: fee demands, BVN/OTP requests, urgency, generic greetings, too-good pay, free-vs-company
  email, company/domain mismatch. Tested: real jobs verified, scams blocked.
- **Five real routes** with shared state and Framer-Motion animation:
  - `/` Jobs — live feed, search, filter chips, animated pastel cards.
  - `/verify` — paste-and-check scam scorer with animated result.
  - `/apply` — auto-apply toggle, role matching, paywall sheet, per-application form + letter.
  - `/stats` — KPIs (count-up), response-rate ring, over-time bars, status pipeline, by-role bars,
    filter + sort, each row expands to the CV + cover letter used.
  - `/profile` — personal details, answers bank, multiple roles each with **CV upload (real PDF text
    extraction)**, account, referral.
- **State** persists in the browser (`localStorage`) via `app/providers.js`.

## Project structure

```
app/
  layout.js            root layout (fonts, Shell)
  providers.js         global state + live-jobs fetch (localStorage)
  page.js              Jobs
  verify/ apply/ stats/ profile/   the other routes
  api/jobs/route.js    live job feed endpoint
components/  Shell.js  Nav.js  JobCard.js
lib/
  verify.js            verification engine (shared)
  source.js            live ingestion + normalise + fallback
  match.js             role↔job matching, letters, demo analytics
```

## What's still STUBBED (the roadmap) — marked `INTEGRATION POINT` in code

| Piece | Where | What to do |
|---|---|---|
| More job sources | `lib/source.js` | Add Greenhouse/Lever public boards, Telegram channel ingestion, employer posting. Tighten freshness to 7 days. |
| Real AI letters | `lib/match.js` `genLetter` | Call an LLM with the CV text + job description (server route + your API key). |
| ATS form submission | `app/apply` | Actually submit into each ATS (the autofill/submit step). Handle bans/ToS carefully. |
| Payments | `app/apply` paywall | Wire Paystack subscription (first month free, then ₦3,000/mo). |
| Company verification | `lib/verify.js` `companyKnown` | CAC registry + email-domain (MX) + LinkedIn/Glassdoor cross-check. |
| Accounts + database | (new) | Add auth + a DB (e.g. Supabase) so data isn't only in the browser. |
| DOCX CV parsing | `app/profile` | Server-side DOCX → text (PDF/TXT already work). |

## Milestones

- **M1 (this):** real project, live job feed, all five screens interactive. ✅
- **M2:** accounts + database (Supabase) so users and applications persist server-side.
- **M3:** real AI letters + more job sources (Telegram, more boards).
- **M4:** Paystack payments + company-verification APIs.
- **M5:** real ATS submission.
