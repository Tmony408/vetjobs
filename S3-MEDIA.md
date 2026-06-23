# File storage (CV uploads) — how to turn it on later

The code is **already in place but dormant**. Right now CV upload works exactly as
before (it reads the text for cover letters); it just doesn't keep the original
file. It costs nothing and won't error. To start storing the actual files, pick a
provider below and set a few environment variables on the **API** service.

## Is it free?
- **AWS S3:** not fully free. 5 GB free for the first 12 months, then ~$0.023/GB
  per month (pennies at your scale). **Requires a credit card** to sign up.
- **Cloudflare R2:** 10 GB free **forever**, no egress fees — but enabling R2 asks
  for a card on file.
- **Supabase Storage:** 1 GB free, **no card** to start. Easiest no-card option.

The backend works with **any** of these (they're all "S3-compatible") — only the
env vars change.

---

## Option 1 — Supabase Storage (no card, easiest to start)
1. Create a free project at supabase.com.
2. **Storage** → create a bucket named `vetjobs-media` → make it **Public**.
3. **Project Settings → Storage** → find the **S3 connection** details
   (endpoint + region) and generate **S3 access keys**.
4. On the Render **vetjobs-api** service → Environment, add:
   ```
   S3_BUCKET=vetjobs-media
   AWS_REGION=<region from Supabase, e.g. us-east-1>
   AWS_ACCESS_KEY_ID=<Supabase S3 key>
   AWS_SECRET_ACCESS_KEY=<Supabase S3 secret>
   S3_ENDPOINT=https://<your-project>.supabase.co/storage/v1/s3
   S3_FORCE_PATH_STYLE=true
   S3_PUBLIC_BASE_URL=https://<your-project>.supabase.co/storage/v1/object/public/vetjobs-media
   ```
5. Redeploy. Done — uploaded CVs now land in Supabase.

## Option 2 — Cloudflare R2 (10 GB free, needs a card on file)
1. Cloudflare dashboard → **R2** → create bucket `vetjobs-media`.
2. **Manage R2 API Tokens** → create a token → note the Access Key, Secret, and the
   account endpoint `https://<account-id>.r2.cloudflarestorage.com`.
3. (For public links) enable the bucket's public `r2.dev` URL or attach a custom domain.
4. On Render **vetjobs-api** → Environment:
   ```
   S3_BUCKET=vetjobs-media
   AWS_REGION=auto
   AWS_ACCESS_KEY_ID=<R2 key>
   AWS_SECRET_ACCESS_KEY=<R2 secret>
   S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
   S3_PUBLIC_BASE_URL=https://<your-public-r2-domain>
   ```
5. Redeploy.

## Option 3 — AWS S3 (the original; needs a card)
1. Create the bucket: `aws s3api create-bucket --bucket vetjobs-media --region us-east-1`
2. Set CORS (so the browser can upload) — see `AWS-DEPLOY.md` Part A2.
3. Create an IAM user scoped to the bucket (`s3:PutObject`, `s3:GetObject`),
   generate an access key — see `AWS-DEPLOY.md` Part A3.
4. On Render **vetjobs-api** → Environment:
   ```
   S3_BUCKET=vetjobs-media
   AWS_REGION=us-east-1
   AWS_ACCESS_KEY_ID=...
   AWS_SECRET_ACCESS_KEY=...
   ```
   (No `S3_ENDPOINT` needed for real AWS.)
5. Redeploy.

---

## CORS (all providers)
The browser uploads directly to the bucket, so the bucket must allow your web
domain. Allow methods **PUT, GET** from `http://localhost:3000` and your live web
URL (e.g. `https://vetjobs-web-xxxx.onrender.com`). Supabase/R2 have a CORS setting
in their dashboard; AWS uses the `cors.json` in `AWS-DEPLOY.md`.

## How it works once on
1. User uploads a CV in **Profile**.
2. The browser asks the API for a 5-minute presigned URL (`POST /api/media/upload-url`).
3. The browser uploads the file **straight to the bucket** — it never passes through
   your server.
4. The file's public link is saved on the role (`cvUrl`), the text is still used for
   cover letters.

## To keep it off
Do nothing — with no `S3_BUCKET`/keys set, uploads silently skip storage and the app
works as it does today. (If you'd rather remove the code entirely, delete
`vetjobs-api/src/media/` and the two AWS SDK lines in `vetjobs-api/package.json`.)
