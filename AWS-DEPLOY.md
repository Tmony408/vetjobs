# Deploy VetJobs on AWS + S3 for media files

Two parts:
- **Part A — S3** for storing CV/media files (do this regardless of where you host).
- **Part B — Compute** on AWS: **App Runner** (simple, recommended) or **EKS**
  (full Kubernetes, advanced).

> Honest cost note: AWS is the most powerful and the most expensive/complex option.
> **EKS** alone is ~$73/mo for the control plane + nodes + load balancer + NAT
> (realistically $120–150/mo). **App Runner** is far cheaper and simpler. **S3** is
> cheap (cents). For your stage, S3 + App Runner (or staying on Render) is the smart
> call; reach for EKS when you have scale and a team.

Prerequisites: an AWS account, and `brew install awscli` then `aws configure`
(paste an access key from IAM). For EKS also `brew install eksctl kubectl helm`.

---

## Part A — S3 for media files (CV uploads)

The backend already has the code: a `MediaModule` that returns short-lived
**presigned URLs** so the browser uploads files **straight to S3** (the file never
touches your server). You just need a bucket + credentials.

### A1. Create the bucket
```bash
aws s3api create-bucket --bucket vetjobs-media --region us-east-1
```
(For regions other than us-east-1, add
`--create-bucket-configuration LocationConstraint=<region>`.)

### A2. Allow browser uploads (CORS)
Save as `cors.json`:
```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["PUT", "GET"],
    "AllowedOrigins": ["http://localhost:3000", "https://yourdomain.com"],
    "ExposeHeaders": []
  }
]
```
```bash
aws s3api put-bucket-cors --bucket vetjobs-media --cors-configuration file://cors.json
```

### A3. Credentials for the backend
Create an IAM user with least-privilege access to just this bucket. Policy:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    { "Effect": "Allow", "Action": ["s3:PutObject", "s3:GetObject"], "Resource": "arn:aws:s3:::vetjobs-media/*" }
  ]
}
```
Create the user in the IAM console (or CLI), attach that policy, generate an access
key, and put the values in the API's environment:
```
AWS_REGION=us-east-1
S3_BUCKET=vetjobs-media
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
```
> On EKS, skip the keys and use **IRSA** (IAM Roles for Service Accounts) instead —
> the pod assumes the role automatically. See Part B.

### A4. Install the new dependency
```bash
cd vetjobs-api && npm install      # pulls in the AWS SDK packages
```

### A5. Wire the frontend (small additions)
In `vetjobs-app/lib/api.js`, add:
```js
mediaUploadUrl: (b) => req("/media/upload-url", { method: "POST", body: b }),
```
Then in `vetjobs-app/app/profile/page.js`, inside `onUpload`, after you read the
CV text, also push the file to S3 and remember its URL:
```js
// request a presigned URL, then upload the file directly to S3
const { uploadUrl, publicUrl } = await api.mediaUploadUrl({ fileName: file.name, contentType: file.type });
await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
// save publicUrl on the role (e.g. add a cvUrl field) so you can link to the real file later
```
That's it — uploaded CVs now live in S3, and you store the link.

---

## Part B — Compute on AWS

### Option 1: AWS App Runner (recommended — simple, no cluster)

App Runner runs a container from an image and gives you an HTTPS URL with
autoscaling. No Kubernetes.

1. **Push images to ECR** (AWS's registry):
   ```bash
   aws ecr create-repository --repository-name vetjobs-api
   aws ecr create-repository --repository-name vetjobs-web
   ACC=$(aws sts get-caller-identity --query Account --output text)
   aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin $ACC.dkr.ecr.us-east-1.amazonaws.com

   docker buildx build --platform linux/amd64 -t $ACC.dkr.ecr.us-east-1.amazonaws.com/vetjobs-api:v1 ./vetjobs-api --push
   docker buildx build --platform linux/amd64 --build-arg NEXT_PUBLIC_API_URL=https://YOUR_API_URL/api \
     -t $ACC.dkr.ecr.us-east-1.amazonaws.com/vetjobs-web:v1 ./vetjobs-app --push
   ```
2. **Create the API service:** App Runner console → Create → source **Container
   registry** → pick `vetjobs-api:v1` → port **4000** → add env vars
   (DATABASE_URL, JWT_SECRET, CORS_ORIGIN, LLM_*, AWS_*/S3_BUCKET). Deploy → copy
   its HTTPS URL.
3. **Create the web service:** same flow with `vetjobs-web:v1`, port **3000**.
   (Rebuild the web image with `--build-arg NEXT_PUBLIC_API_URL=<the API URL>/api`
   so it points at the API.)
4. Open the web URL — done.

### Option 2: EKS (your Kubernetes manifests on AWS)

Use this only when you genuinely need Kubernetes.

1. **Create the cluster** (~15–20 min):
   ```bash
   eksctl create cluster --name vetjobs --region us-east-1 --nodes 2 --node-type t3.small --managed
   kubectl get nodes
   ```
2. **Push images to ECR** (same as Option 1, step 1). Update the `image:` lines in
   `k8s/api.yaml` and `k8s/web.yaml` to the ECR URLs.
3. **Secrets + deploy** — follow `K8S-PRODUCTION.md` steps 5–7 (create the
   `api-secret` with `kubectl`, `kubectl apply` the api/web manifests; use **Neon**,
   not in-cluster Postgres).
4. **S3 access without keys (IRSA):**
   ```bash
   eksctl utils associate-iam-oidc-provider --cluster vetjobs --approve
   eksctl create iamserviceaccount --cluster vetjobs --namespace vetjobs \
     --name api --attach-policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess --approve
   ```
   Then set `serviceAccountName: api` on the API Deployment's pod spec. The pods get
   S3 access through the role — no AWS keys in env needed.
5. **Public HTTPS** — install the **AWS Load Balancer Controller** (Helm), then use
   an `ALB` Ingress with an **ACM** certificate, and a **Route 53** record for your
   domain. (This is the most involved part of EKS; the AWS Load Balancer Controller
   docs walk through it.)
6. **Operate** with the same `kubectl` commands as in `K8S-PRODUCTION.md` §9.

---

## Recommended path for you
1. **S3 now** (Part A) — cheap, and gives you real file storage.
2. **App Runner** (Option 1) for compute, or just keep **Render** — both are far
   cheaper and simpler than EKS.
3. **EKS** later, only when scale demands it.

## Checklist
- [ ] S3 bucket created, CORS set, IAM policy scoped to just the bucket.
- [ ] `npm install` run in `vetjobs-api` (AWS SDK added).
- [ ] AWS creds via env (App Runner / local) **or** IRSA (EKS) — never commit keys.
- [ ] Images built `--platform linux/amd64`, pushed to ECR.
- [ ] `NEXT_PUBLIC_API_URL` baked into the web image = the deployed API URL.
- [ ] `CORS_ORIGIN` = your real web domain (not `*`).
