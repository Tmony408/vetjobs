# VetJobs Auto-Apply — Chrome extension

Fills job-application forms with your VetJobs profile and AI-written answers, lets
you review, then submits when you confirm. It signs in with the **same VetJobs
account** (email + password) and uses your existing API + Groq answer engine.

## How it works
1. **Popup** — sign in with your VetJobs email + password (Supabase). It loads your
   profile, your roles' CV text, and your saved answers.
2. **Fill this application page** — injects a content script that:
   - finds the form fields and reads each field's label,
   - fills known fields directly from your profile (name, email, phone, location,
     LinkedIn, portfolio),
   - sends the remaining free-text questions to `POST /api/answer/batch`, which
     answers them from your CV + saved answers (and flags anything it can't know),
   - highlights every field it touched (green = filled, amber = needs your review).
3. **Review & submit panel** — bottom-right. Shows what was filled and what still
   needs you. Click **Submit application** to submit (it confirms first if anything
   still needs your input).

## Load it (developer mode)
1. Go to `chrome://extensions`, turn on **Developer mode** (top-right).
2. **Load unpacked** → select this `vetjobs-extension/` folder.
3. Pin the extension, open the popup, sign in.

## Config
Defaults live in `config.js` (production API + public Supabase anon key). To point
at a local API, open the popup → **Advanced** → set the API base URL (e.g.
`http://localhost:4000/api`).

## Notes / limits (v0.1)
- `<select>` dropdowns and radio/checkbox groups aren't auto-filled yet — those are
  highlighted for you to set. Text inputs and textareas are handled.
- File inputs (CV upload) can't be set programmatically by extensions for security;
  attach your CV manually on sites that require an upload.
- Anti-bot/CAPTCHA pages may block automated submit — review and submit by hand there.
