# Deploying VetJobs to Production on Your Own Kubernetes Cluster

A complete, ordered runbook. It uses a **managed** Kubernetes cluster (you never
hand-run the control plane), **Neon** for Postgres (don't run a database in the
cluster for production), **GitHub Container Registry (GHCR)** for images, and
**cert-manager + ingress-nginx** for HTTPS on your domain.

Placeholders to replace as you go: `YOURUSER` (GitHub username), `yourdomain.com`.

---

## 0. What you'll end up with
```
Internet → (DNS) → Ingress (HTTPS/TLS) ─┬─ /api → vetjobs-api pods → Neon Postgres
                                        └─ /    → vetjobs-web pods
```

## 1. Install the tools (one-time, on your Mac)
```bash
brew install kubectl helm
# the CLI for your chosen cloud, e.g. DigitalOcean:
brew install doctl
```
You also need **Docker** (you have it) and a **domain name** you control.

---

## 2. Create a managed cluster
Use any managed provider — **DigitalOcean (DOKS)**, **Civo**, **Linode LKE**,
**GKE/EKS/AKS**. DigitalOcean shown here (beginner-friendly).

**Dashboard way:** DigitalOcean → Kubernetes → Create → pick a region near your
users, node pool of **2 nodes** (smallest is fine to start), create. Wait ~5 min.

**CLI way:**
```bash
doctl auth init                      # paste an API token from the DO dashboard
doctl kubernetes cluster create vetjobs --region lon1 --count 2 --size s-2vcpu-2gb
```

## 3. Point kubectl at the cluster
The provider gives you a **kubeconfig**. For DigitalOcean:
```bash
doctl kubernetes cluster kubeconfig save vetjobs
kubectl get nodes        # you should see your nodes = success
```
(Other providers: download the kubeconfig file and `export KUBECONFIG=/path/to/that/file`.)

---

## 4. Build and push your images to a registry
A cloud cluster can't see local images — they must live in a registry. We'll use
GHCR (free, tied to your GitHub).

**Important (Apple Silicon):** cloud nodes are `amd64`, but a Mac builds `arm64`
by default. Always build with `--platform linux/amd64` or the pods will crash-loop.

```bash
# log in to GHCR with a GitHub token that has 'write:packages'
echo YOUR_GITHUB_TOKEN | docker login ghcr.io -u YOURUSER --password-stdin

# API image (tag with a version, not :latest, for real deploys)
docker buildx build --platform linux/amd64 \
  -t ghcr.io/YOURUSER/vetjobs-api:v1 ./vetjobs-api --push

# WEB image — the API URL is baked in at build time, so pass it here:
docker buildx build --platform linux/amd64 \
  --build-arg NEXT_PUBLIC_API_URL=https://yourdomain.com/api \
  -t ghcr.io/YOURUSER/vetjobs-web:v1 ./vetjobs-app --push
```
Then on github.com → your profile → Packages, set both packages to **Public**
(simplest), so the cluster can pull them without a secret.

## 5. Production edits to the manifests
1. In `k8s/api.yaml` and `k8s/web.yaml`, change the `image:` lines to your pushed
   names: `ghcr.io/YOURUSER/vetjobs-api:v1` and `ghcr.io/YOURUSER/vetjobs-web:v1`.
2. In `k8s/api.yaml`, **delete the entire `Secret` block** (the one named
   `api-secret`) — in production you create secrets with `kubectl` (next step), not
   in git. Keep the Deployment/Service.
3. **Do not** apply `k8s/postgres.yaml` — you're using Neon. (Keep it only for local.)
4. (Later, not now) For a mature setup, switch the API off `synchronize: true` and
   use TypeORM **migrations**. For the very first deploy, leaving it on lets it
   create the tables in Neon automatically.

## 6. Namespace + secrets (created securely, not committed)
```bash
kubectl apply -f k8s/namespace.yaml

kubectl -n vetjobs create secret generic api-secret \
  --from-literal=DATABASE_URL='YOUR_NEON_URL' \
  --from-literal=JWT_SECRET='A_LONG_RANDOM_STRING' \
  --from-literal=CORS_ORIGIN='https://yourdomain.com' \
  --from-literal=LLM_API_KEY='YOUR_GROQ_KEY' \
  --from-literal=LLM_BASE_URL='https://api.groq.com/openai/v1' \
  --from-literal=LLM_MODEL='llama-3.3-70b-versatile'
```

## 7. Deploy the app
```bash
kubectl apply -f k8s/api.yaml
kubectl apply -f k8s/web.yaml
kubectl -n vetjobs get pods -w      # wait until both show Running
kubectl -n vetjobs logs deploy/api  # check the API connected to Neon
```

---

## 8. Expose it on your domain with HTTPS

**8a. Install the ingress controller** (gives you one public load balancer):
```bash
helm upgrade --install ingress-nginx ingress-nginx \
  --repo https://kubernetes.github.io/ingress-nginx \
  --namespace ingress-nginx --create-namespace
kubectl -n ingress-nginx get svc    # note the EXTERNAL-IP (may take a minute)
```

**8b. Point your domain at that EXTERNAL-IP.** In your domain registrar's DNS,
add an **A record**: `yourdomain.com → <EXTERNAL-IP>` (and `www` if you want).

**8c. Install cert-manager for free auto-TLS (Let's Encrypt):**
```bash
helm upgrade --install cert-manager cert-manager \
  --repo https://charts.jetstack.io --namespace cert-manager --create-namespace \
  --set crds.enabled=true
```
Create an issuer — save as `k8s/issuer.yaml` and apply it:
```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: you@yourdomain.com
    privateKeySecretRef:
      name: letsencrypt
    solvers:
      - http01:
          ingress:
            class: nginx
```
```bash
kubectl apply -f k8s/issuer.yaml
```

**8d. Update `k8s/ingress.yaml`** to your real domain with TLS, then apply:
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: vetjobs
  namespace: vetjobs
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt
spec:
  ingressClassName: nginx
  tls:
    - hosts: [yourdomain.com]
      secretName: vetjobs-tls
  rules:
    - host: yourdomain.com
      http:
        paths:
          - path: /api
            pathType: Prefix
            backend: { service: { name: api, port: { number: 4000 } } }
          - path: /
            pathType: Prefix
            backend: { service: { name: web, port: { number: 3000 } } }
```
```bash
kubectl apply -f k8s/ingress.yaml
```
Within a minute or two cert-manager issues a certificate and
**https://yourdomain.com** is live and secure.

---

## 9. Operate it (the day-2 commands)
```bash
kubectl -n vetjobs get pods                 # health
kubectl -n vetjobs logs -f deploy/api       # tail logs
kubectl -n vetjobs scale deploy/api --replicas=4   # scale up
kubectl -n vetjobs rollout restart deploy/api      # restart
kubectl -n vetjobs rollout undo deploy/api         # roll back a bad deploy
```

**Ship a new version:** build+push a new tag (`:v2`), then:
```bash
kubectl -n vetjobs set image deploy/api api=ghcr.io/YOURUSER/vetjobs-api:v2
kubectl -n vetjobs set image deploy/web web=ghcr.io/YOURUSER/vetjobs-web:v2
```
Kubernetes does a zero-downtime rolling update (and auto-rolls-back if pods fail).

**Optional autoscaling** (needs metrics-server installed):
```bash
kubectl -n vetjobs autoscale deploy/api --min=2 --max=6 --cpu-percent=70
```

---

## 10. Automate it later (CI/CD)
Once manual deploys feel solid, add a GitHub Actions workflow that, on every push
to `main`: builds + pushes the images and runs the `kubectl set image` commands.
Ask me and I'll generate `.github/workflows/deploy.yml` for you.

---

## Production checklist
- [ ] Secrets created with `kubectl`, **not** committed to git.
- [ ] `JWT_SECRET` is long and random; `CORS_ORIGIN` is your real domain (not `*`).
- [ ] Images built `--platform linux/amd64` and tagged with versions.
- [ ] Using **Neon** (managed Postgres), not in-cluster Postgres.
- [ ] HTTPS working via cert-manager.
- [ ] `replicas: 2`+ on api and web for high availability.
- [ ] (Maturity) TypeORM migrations instead of `synchronize: true`.
- [ ] (Maturity) resource `requests/limits` set, autoscaling, monitoring/alerts.

## Cost reality check
A 2-node managed cluster + load balancer typically runs **~$30–40/month** all-in
(nodes + LB), separate from Neon. That's real money for zero users — so keep your
**Render** deployment as the live test until you have traffic that justifies this.
