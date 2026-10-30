#!/bin/bash
set -euo pipefail

echo "🚀 Starting Campus Feedback System AWS Deployment..."

# Secrets come from the environment (GitHub Actions secrets passed over SSH), never from this file.
for var in DATABASE_URL JWT_SECRET GATEWAY_INTERNAL_SECRET CLERK_SECRET_KEY CLERK_PUBLISHABLE_KEY; do
  if [ -z "${!var:-}" ]; then
    echo "❌ Missing required environment variable: $var" >&2
    exit 1
  fi
done
GEMINI_API_KEY="${GEMINI_API_KEY:-}"
ADMIN_EMAILS="${ADMIN_EMAILS:-}"
SMTP_HOST="${SMTP_HOST:-}"
SMTP_PORT="${SMTP_PORT:-587}"
SMTP_USER="${SMTP_USER:-}"
SMTP_PASS="${SMTP_PASS:-}"
SMTP_FROM="${SMTP_FROM:-}"

# .env files readable by the deploy user only
umask 077

# 1. Write auth-service .env
echo "📦 Configuring auth-service .env..."
cat << ENVFILE > auth-service/.env
DATABASE_URL="${DATABASE_URL}"
PORT=6001
NODE_ENV=production
JWT_SECRET="${JWT_SECRET}"
GATEWAY_INTERNAL_SECRET="${GATEWAY_INTERNAL_SECRET}"
CLERK_SECRET_KEY="${CLERK_SECRET_KEY}"
ADMIN_EMAILS="${ADMIN_EMAILS}"
SMTP_HOST="${SMTP_HOST}"
SMTP_PORT=${SMTP_PORT}
SMTP_USER="${SMTP_USER}"
SMTP_PASS="${SMTP_PASS}"
SMTP_FROM="${SMTP_FROM}"
ENVFILE

# 2. Write feedback-microservice .env
echo "📦 Configuring feedback-microservice .env..."
cat << ENVFILE > feedback-microservice/.env
DATABASE_URL="${DATABASE_URL}"
PORT=6002
NODE_ENV=production
GATEWAY_INTERNAL_SECRET="${GATEWAY_INTERNAL_SECRET}"
GEMINI_API_KEY="${GEMINI_API_KEY}"
ENVFILE

# 3. Write gateway .env
echo "📦 Configuring gateway .env..."
cat << ENVFILE > gateway/.env
PORT=8000
NODE_ENV=production
AUTH_SERVICE_URL=http://localhost:6001
FEEDBACK_SERVICE_URL=http://localhost:6002
JWT_SECRET="${JWT_SECRET}"
GATEWAY_INTERNAL_SECRET="${GATEWAY_INTERNAL_SECRET}"
CLERK_SECRET_KEY="${CLERK_SECRET_KEY}"
CLERK_PUBLISHABLE_KEY="${CLERK_PUBLISHABLE_KEY}"
ENVFILE

# 4. Install all dependencies and generate Prisma clients
echo "📦 Installing packages across microservices..."
npm run install:all
echo "🔧 Generating Prisma clients..."
(cd auth-service && npx prisma generate)
(cd feedback-microservice && npx prisma generate)

# 5. Start/Restart services with PM2
echo "⚡ Starting services with PM2..."
(cd auth-service && { pm2 delete campus-auth 2>/dev/null || true; } && pm2 start src/server.js --name "campus-auth")
(cd feedback-microservice && { pm2 delete campus-feedback 2>/dev/null || true; } && pm2 start src/server.js --name "campus-feedback")
(cd gateway && { pm2 delete campus-gateway 2>/dev/null || true; } && pm2 start src/server.js --name "campus-gateway")

pm2 save

# 6. Fail the deploy if any service did not come up (e.g. a missing secret makes it exit on start)
echo "🩺 Checking service health..."
for url in http://localhost:8000/health http://localhost:6001/health http://localhost:6002/health; do
  ok=""
  for _ in $(seq 1 15); do
    if curl -fsS --max-time 3 "$url" > /dev/null; then ok=1; break; fi
    sleep 2
  done
  if [ -z "$ok" ]; then
    echo "❌ Health check failed: $url" >&2
    pm2 logs --nostream --lines 30 || true
    exit 1
  fi
  echo "   ✓ $url"
done

echo ""
echo "========================================================="
echo "✅ All 3 Campus Feedback microservices are running on AWS!"
echo "========================================================="
pm2 status
