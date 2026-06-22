# Deploy to Render (test it live, no localhost)

You'll end up with two public URLs — the web app and the API — backed by your
Neon Postgres. Free tier works for testing (services sleep when idle, so the
first request after a while takes ~30–50s to wake).

## 1. Put the code on GitHub
Render deploys from a Git repo. Push this whole `Claude projects` folder to a new
GitHub repository (the `render.yaml` must sit at the repo root — it does).

If you've never done this:
```bash
cd "Claude projects"
git init
git add .
git commit -m "VetJobs"
# create an empty repo on github.com, then:
git remote add origin https://github.com/<you>/vetjobs.git
git push -u origin main
```
(Your `.env` files are gitignored, so your secrets are NOT pushed — good.)

## 2. Create the services on Render
1. Go to **dashboard.render.com** → **New +** → **Blueprint**.
2. Connect your GitHub and pick the repo. Render reads `render.yaml` and shows
   two services: **vetjobs-api** and **vetjobs-web**. Click **Apply**.

## 3. Set the secrets
On **vetjobs-api** → Environment, fill the values marked "sync: false":
- **DATABASE_URL** → your Neon connection string (the one in your `.env`).
- **LLM_API_KEY** → your Groq key (optional; skip and letters still generate).

The API will build, connect to Neon (SSL is handled automatically), create the
tables, and go live. Copy its URL, e.g. `https://vetjobs-api-xxxx.onrender.com`.

## 4. Point the web app at the API
On **vetjobs-web** → Environment:
- Set **NEXT_PUBLIC_API_URL** = `https://vetjobs-api-xxxx.onrender.com/api`
  (your API URL from step 3, with `/api` on the end).
- Save → Render rebuilds the web app and bakes that URL in.

## 5. (Optional) Lock down CORS
On **vetjobs-api** → Environment, change **CORS_ORIGIN** from `*` to your web URL,
e.g. `https://vetjobs-web-xxxx.onrender.com`. Save.

## 6. Test it live
Open the **vetjobs-web** URL. Jobs + the scam checker work with no account;
click **Apply** → create an account → it persists to Neon. Done — all in the cloud.

---

### Updating later
Push to GitHub → Render auto-redeploys. Changing `NEXT_PUBLIC_API_URL` requires a
web rebuild (Render does this when you save the env var).

### If the API fails to start
- Check the **Logs** tab. The usual cause is the DB URL — make sure `DATABASE_URL`
  is the full Neon string. SSL is already handled in code.
- If Neon rejects `channel_binding=require`, remove that one parameter from the URL.
