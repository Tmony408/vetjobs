# Supabase Auth setup

Auth (email + Google) is now handled by **Supabase**. The NestJS backend just
**verifies** the Supabase token; your app data stays in **Neon**.

## 1. Create a Supabase project
- supabase.com → New project (free). Pick a region near you.
- Settings → **API**: copy the **Project URL** and the **anon public** key.

## 2. Set the env vars
**Web service (vetjobs-web) → Environment:**
```
NEXT_PUBLIC_SUPABASE_URL = https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = <anon public key>
```
**API service (vetjobs-api) → Environment:**
```
SUPABASE_URL = https://YOUR-PROJECT.supabase.co
SUPABASE_ANON_KEY = <anon public key>
```

## 3. Configure Supabase Auth
Authentication → **URL Configuration**:
- **Site URL:** `https://vetjobs.onrender.com`
- **Redirect URLs:** add `https://vetjobs.onrender.com/**` and `http://localhost:3000/**`

Authentication → **Providers → Email**:
- For instant testing, toggle **Confirm email OFF** (otherwise users must click an
  email link before they can sign in). You can turn it back on later.

Authentication → **Providers → Google** (optional — email works without it):
- Toggle Google on. It shows a **callback URL** — copy it.
- In Google Cloud Console → Credentials → create an **OAuth client (Web)**, paste
  that callback URL as an Authorized redirect URI, and add `https://vetjobs.onrender.com`
  to Authorized JavaScript origins. Copy the Client ID + Secret back into Supabase.
- (Email/password and the "Continue with Google" button both work once this is set;
  if you skip Google, just use email.)

## 4. Reset the database tables (one-time)
The `users` table's id is now the **Supabase user id** (not an auto-generated one),
so drop the old tables and let the API recreate them on next boot. In the **Neon SQL
editor**, run:
```sql
DROP TABLE IF EXISTS applications, roles, users CASCADE;
```
(Safe pre-launch — there's no real user data yet.)

## 5. Deploy
```bash
cd "Documents/Claude projects/vetjobs"
git add . && git commit -m "Switch auth to Supabase (email + Google), Neon for data" && git push
```
Render redeploys both services (and `npm install` pulls the Supabase SDK).

## How it works now
- The frontend signs in via Supabase (email or Google) and gets a session token.
- Every API call sends that token; the backend asks Supabase "who is this?" and,
  on first sign-in, creates a profile row in Neon keyed by the Supabase user id.
- Roles, applications, CVs — all still in Neon, linked to that id.

## What you no longer maintain
Password hashing, JWT signing, password resets, email verification, Google OAuth
flow — all handled by Supabase.
