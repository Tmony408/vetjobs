# VetJobs — Docker & Kubernetes

Two services — `vetjobs-api` (NestJS) and `vetjobs-app` (Next.js) — plus PostgreSQL.

## Run the whole stack locally with Docker

From this folder (`Claude projects/`):
```bash
docker compose up --build
```
- Web → http://localhost:3000
- API → http://localhost:4000/api
- Postgres → localhost:5432

Stop with `docker compose down` (add `-v` to wipe the database volume).

## Build the images (for Kubernetes)

```bash
docker build -t vetjobs-api:latest ./vetjobs-api
docker build -t vetjobs-web:latest ./vetjobs-app
```

If you use **minikube** or **kind**, load the images into the cluster so it can find them:
```bash
# minikube
minikube image load vetjobs-api:latest
minikube image load vetjobs-web:latest
# kind
kind load docker-image vetjobs-api:latest
kind load docker-image vetjobs-web:latest
```
For a real cluster, push to a registry (Docker Hub, GHCR, ECR…) and change the
`image:` fields in `k8s/api.yaml` and `k8s/web.yaml` to the pushed names.

## Deploy to Kubernetes

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/postgres.yaml
kubectl apply -f k8s/api.yaml
kubectl apply -f k8s/web.yaml
kubectl apply -f k8s/ingress.yaml      # optional; needs an ingress controller
```

Check it:
```bash
kubectl -n vetjobs get pods
```

**Before deploying**, edit the secrets:
- `k8s/postgres.yaml` → real Postgres password.
- `k8s/api.yaml` → `JWT_SECRET` (long random), and `LLM_API_KEY` if you want AI cover letters (free Groq key from console.groq.com).

### Reaching it
- With the ingress: add `127.0.0.1 vetjobs.local` to your `/etc/hosts`, then open `http://vetjobs.local`.
- Without ingress, port-forward:
  ```bash
  kubectl -n vetjobs port-forward svc/web 3000:3000
  kubectl -n vetjobs port-forward svc/api 4000:4000
  ```

## Notes

- The API auto-creates tables on first boot (`synchronize: true`). For production,
  switch to TypeORM **migrations** and set `synchronize: false`.
- `replicas: 2` for api and web give you basic high availability; scale with
  `kubectl -n vetjobs scale deploy/api --replicas=3`.
- Postgres here is a single replica with a PVC. For production, prefer a managed
  database (Neon/Supabase/RDS/Cloud SQL) and point `DATABASE_URL` at it instead.
