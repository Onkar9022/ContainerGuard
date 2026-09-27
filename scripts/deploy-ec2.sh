#!/bin/bash
set -euo pipefail

# =============================================================================
# ContainerGuard Production EC2 Deployment Script
# =============================================================================
# Arguments:
#   $1 = BACKEND_IMAGE  (ECR URI with exact commit SHA)
#   $2 = FRONTEND_IMAGE (ECR URI with exact commit SHA)
#   $3 = DEPLOY_SHA     (Git commit SHA being deployed)
# =============================================================================

BACKEND_IMG="${1:?Backend image parameter required}"
FRONTEND_IMG="${2:?Frontend image parameter required}"
DEPLOY_SHA="${3:?Deploy SHA parameter required}"

echo "=== ContainerGuard Deployment Started for SHA: ${DEPLOY_SHA} ==="
cd /home/ec2-user/containerguard

# -----------------------------------------------------------------------------
# 1. Download configuration files from exact GITHUB_SHA using plain raw URLs
# -----------------------------------------------------------------------------
mkdir -p nginx

echo "Downloading docker-compose.prod.yml from commit ${DEPLOY_SHA}..."
curl -fsSL --retry 5 --retry-delay 3 "https://raw.githubusercontent.com/Onkar9022/ContainerGuard/${DEPLOY_SHA}/docker-compose.prod.yml" -o docker-compose.prod.yml

echo "Downloading nginx.prod.conf from commit ${DEPLOY_SHA}..."
curl -fsSL --retry 5 --retry-delay 3 "https://raw.githubusercontent.com/Onkar9022/ContainerGuard/${DEPLOY_SHA}/nginx/nginx.prod.conf" -o nginx/nginx.prod.conf

# -----------------------------------------------------------------------------
# 2. Safely prepare .env.prod (Preserve existing secrets and bootstrap missing)
# -----------------------------------------------------------------------------
echo "--- Safely preparing production environment variables ---"
touch .env.prod

ensure_env_var() {
  local key="$1"
  local existing_val=""
  if grep -q "^${key}=" .env.prod 2>/dev/null; then
    existing_val=$(grep "^${key}=" .env.prod | head -n1 | cut -d= -f2-)
  fi

  if [ -z "$existing_val" ]; then
    if [ -f .env ] && grep -q "^${key}=" .env; then
      sed -i "/^${key}=/d" .env.prod 2>/dev/null || true
      grep -m 1 "^${key}=" .env >> .env.prod
      echo "Bootstrapped ${key} into .env.prod"
    else
      echo "ERROR: Required database configuration ${key} is missing from .env.prod and .env" >&2
      exit 1
    fi
  else
    echo "Preserving existing ${key} in .env.prod"
  fi
}

# Safely copy ONLY required database credentials from .env without printing values
ensure_env_var POSTGRES_USER
ensure_env_var POSTGRES_PASSWORD
ensure_env_var POSTGRES_DB

# -----------------------------------------------------------------------------
# 3. Update immutable image variables
# -----------------------------------------------------------------------------
echo "--- Updating image references in .env.prod ---"
sed -i '/^BACKEND_IMAGE=/d' .env.prod 2>/dev/null || true
sed -i '/^FRONTEND_IMAGE=/d' .env.prod 2>/dev/null || true
echo "BACKEND_IMAGE=${BACKEND_IMG}" >> .env.prod
echo "FRONTEND_IMAGE=${FRONTEND_IMG}" >> .env.prod

# -----------------------------------------------------------------------------
# 4. Set production defaults if missing (never overwrite existing values)
# -----------------------------------------------------------------------------
echo "--- Preserving non-secret production configuration ---"
grep -q '^PROD_HTTP_PORT=' .env.prod || echo 'PROD_HTTP_PORT=8080' >> .env.prod
grep -q '^VITE_API_URL=' .env.prod || echo 'VITE_API_URL=' >> .env.prod
grep -q '^CPU_ALERT_THRESHOLD_PERCENT=' .env.prod || echo 'CPU_ALERT_THRESHOLD_PERCENT=80' >> .env.prod
grep -q '^MEMORY_ALERT_THRESHOLD_PERCENT=' .env.prod || echo 'MEMORY_ALERT_THRESHOLD_PERCENT=80' >> .env.prod
grep -q '^POLICY_ALERT_SCORE_THRESHOLD=' .env.prod || echo 'POLICY_ALERT_SCORE_THRESHOLD=70' >> .env.prod
grep -q '^RESTART_LOOP_THRESHOLD=' .env.prod || echo 'RESTART_LOOP_THRESHOLD=3' >> .env.prod
grep -q '^RESTART_LOOP_WINDOW_SECONDS=' .env.prod || echo 'RESTART_LOOP_WINDOW_SECONDS=300' >> .env.prod
grep -q '^ALERT_EVALUATION_INTERVAL_MS=' .env.prod || echo 'ALERT_EVALUATION_INTERVAL_MS=10000' >> .env.prod
grep -q '^CORS_ORIGIN=' .env.prod || echo 'CORS_ORIGIN=http://localhost:8080,http://localhost,http://localhost:5173' >> .env.prod

# -----------------------------------------------------------------------------
# 5. PostgreSQL Volume Safety (Requirement 9)
# -----------------------------------------------------------------------------
echo "--- Inspecting PostgreSQL volume configuration ---"
DETECTED_VOL=""
for OLD_PG in containerguard-postgres compose-containerguard-postgres; do
  if docker ps -a --format '{{.Names}}' | grep -q "^${OLD_PG}$"; then
    VNAME=$(docker inspect "$OLD_PG" --format '{{range .Mounts}}{{if eq .Destination "/var/lib/postgresql/data"}}{{.Name}}{{end}}{{end}}' 2>/dev/null || true)
    if [ -n "$VNAME" ]; then
      DETECTED_VOL="$VNAME"
      break
    fi
  fi
done

if [ -z "$DETECTED_VOL" ] && docker volume ls -q | grep -q '^containerguard-postgres-data$'; then
  DETECTED_VOL="containerguard-postgres-data"
fi

if [ -n "$DETECTED_VOL" ]; then
  echo "Using detected existing PostgreSQL volume: ${DETECTED_VOL}"
  sed -i '/^POSTGRES_VOLUME_NAME=/d' .env.prod 2>/dev/null || true
  echo "POSTGRES_VOLUME_NAME=${DETECTED_VOL}" >> .env.prod
elif ! grep -q '^POSTGRES_VOLUME_NAME=' .env.prod 2>/dev/null; then
  echo 'POSTGRES_VOLUME_NAME=containerguard-prod-postgres-data' >> .env.prod
fi

# -----------------------------------------------------------------------------
# 6. Compose configuration validation (Requirement 12)
# -----------------------------------------------------------------------------
echo "--- Validating production Compose configuration ---"
if ! docker compose -f docker-compose.prod.yml --env-file .env.prod config --quiet; then
  echo "❌ Compose validation failed!" >&2
  docker compose -f docker-compose.prod.yml --env-file .env.prod config
  exit 1
fi
echo "✅ Compose configuration valid"

# -----------------------------------------------------------------------------
# 7. ECR Login (Requirement 13)
# -----------------------------------------------------------------------------
echo "--- Logging in to Amazon ECR ---"
aws ecr get-login-password --region ap-south-1 | docker login --username AWS --password-stdin 461415799543.dkr.ecr.ap-south-1.amazonaws.com

# -----------------------------------------------------------------------------
# 8. Pull exact SHA images (Requirement 13)
# -----------------------------------------------------------------------------
echo "--- Pulling exact SHA images ---"
docker compose -f docker-compose.prod.yml --env-file .env.prod pull backend frontend

# -----------------------------------------------------------------------------
# 9. Controlled transition of old containers (Requirement 10)
# -----------------------------------------------------------------------------
echo "--- Gracefully stopping superseded old containers ---"
for OLD_C in containerguard-backend containerguard-frontend containerguard-postgres compose-containerguard-backend compose-containerguard-frontend compose-containerguard-postgres; do
  if docker ps -q -f "name=^/${OLD_C}$" | grep -q .; then
    echo "Stopping old container: ${OLD_C}"
    docker stop -t 10 "${OLD_C}" 2>/dev/null || true
  fi
done

# -----------------------------------------------------------------------------
# 10. Start production stack (Requirement 14)
# -----------------------------------------------------------------------------
echo "--- Starting production services ---"
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d

# -----------------------------------------------------------------------------
# 11. Bounded health check loop (Requirement 15)
# -----------------------------------------------------------------------------
echo "--- Waiting for production services to become healthy ---"
ALL_HEALTHY=0
for attempt in $(seq 1 30); do
  UNHEALTHY=0
  for SVC in postgres backend frontend nginx; do
    CID=$(docker compose -f docker-compose.prod.yml --env-file .env.prod ps -q "$SVC" 2>/dev/null || true)
    if [ -z "$CID" ]; then
      UNHEALTHY=1
      break
    fi
    HSTATUS=$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$CID" 2>/dev/null || echo "unknown")
    if [ "$HSTATUS" != "healthy" ]; then
      UNHEALTHY=1
      break
    fi
  done
  if [ "$UNHEALTHY" -eq 0 ]; then
    echo "All production services healthy on attempt ${attempt}!"
    ALL_HEALTHY=1
    break
  fi
  sleep 2
done

if [ "$ALL_HEALTHY" -ne 1 ]; then
  echo "❌ Health check timed out after 60 seconds!"
  docker compose -f docker-compose.prod.yml --env-file .env.prod ps
  echo "--- Postgres Logs ---"
  docker logs --tail 30 containerguard-prod-postgres 2>&1 || true
  echo "--- Backend Logs ---"
  docker logs --tail 40 containerguard-prod-backend 2>&1 || true
  echo "--- Frontend Logs ---"
  docker logs --tail 20 containerguard-prod-frontend 2>&1 || true
  echo "--- Nginx Logs ---"
  docker logs --tail 20 containerguard-prod-nginx 2>&1 || true
  exit 1
fi

# -----------------------------------------------------------------------------
# 12. Endpoints verification from EC2 (Requirement 16)
# -----------------------------------------------------------------------------
echo "--- Verifying endpoints via Nginx gateway (:8080) ---"
curl -fsS http://127.0.0.1:8080/healthz > /dev/null && echo "✅ /healthz OK"
curl -fsS http://127.0.0.1:8080/api/health > /dev/null && echo "✅ /api/health OK"
curl -fsS http://127.0.0.1:8080/api/docker/ping > /dev/null && echo "✅ /api/docker/ping OK"
curl -fsS http://127.0.0.1:8080/api/metrics > /dev/null && echo "✅ /api/metrics OK"
curl -fsS http://127.0.0.1:8080/api/security/trivy-status > /dev/null && echo "✅ /api/security/trivy-status OK"
curl -fsS http://127.0.0.1:8080/api/security/policies/summary > /dev/null && echo "✅ /api/security/policies/summary OK"
curl -fsS http://127.0.0.1:8080/api/alerts/summary > /dev/null && echo "✅ /api/alerts/summary OK"
curl -fsS http://127.0.0.1:8080/ | grep -qi '<html' && echo "✅ Frontend root OK"

# -----------------------------------------------------------------------------
# 13. Image SHA verification (Requirement 17)
# -----------------------------------------------------------------------------
echo "--- Verifying deployed image SHA on running containers ---"
RUNNING_BACKEND=$(docker inspect --format='{{.Config.Image}}' containerguard-prod-backend)
RUNNING_FRONTEND=$(docker inspect --format='{{.Config.Image}}' containerguard-prod-frontend)
echo "Running backend: ${RUNNING_BACKEND}"
echo "Running frontend: ${RUNNING_FRONTEND}"
if [ "${RUNNING_BACKEND}" != "${BACKEND_IMG}" ]; then
  echo "❌ Running backend image does not match expected SHA image!"
  exit 1
fi
if [ "${RUNNING_FRONTEND}" != "${FRONTEND_IMG}" ]; then
  echo "❌ Running frontend image does not match expected SHA image!"
  exit 1
fi
echo "✅ Both containers running exact SHA images"

# -----------------------------------------------------------------------------
# 14. Old stack cleanup (Requirement 18)
# -----------------------------------------------------------------------------
echo "--- Cleaning up superseded old containers ---"
for OLD_C in containerguard-backend containerguard-frontend containerguard-postgres compose-containerguard-backend compose-containerguard-frontend compose-containerguard-postgres; do
  if docker ps -a -q -f "name=^/${OLD_C}$" | grep -q .; then
    echo "Removing superseded container: ${OLD_C}"
    docker rm -f "${OLD_C}" 2>/dev/null || true
  fi
done

echo "--- Pruning dangling images ---"
docker image prune -f
echo "=== ContainerGuard Deployment Complete & Verified for SHA: ${DEPLOY_SHA} ==="
