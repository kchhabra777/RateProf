#!/bin/bash
set -e

echo "🚀 Starting Campus Feedback System AWS Deployment..."

export DATABASE_URL="postgresql://neondb_owner:npg_5cqpzoHbZ7IM@ep-quiet-pond-aycfuiga-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

# 1. Write auth-service .env
echo "📦 Configuring auth-service .env..."
cat << 'EOF' > auth-service/.env
DATABASE_URL="postgresql://neondb_owner:npg_5cqpzoHbZ7IM@ep-quiet-pond-aycfuiga-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
PORT=6001
NODE_ENV=production
JWT_SECRET="thapar_campus_feedback_jwt_secret_key_2026"
GATEWAY_INTERNAL_SECRET="rateprof_internal_gw_sec_2026_ti_campus"
EOF

# 2. Write feedback-microservice .env
echo "📦 Configuring feedback-microservice .env..."
cat << EOF > feedback-microservice/.env
DATABASE_URL="postgresql://neondb_owner:npg_5cqpzoHbZ7IM@ep-quiet-pond-aycfuiga-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
PORT=6002
NODE_ENV=production
GATEWAY_INTERNAL_SECRET="rateprof_internal_gw_sec_2026_ti_campus"
GEMINI_API_KEY="${GEMINI_API_KEY}"
EOF

# 3. Write gateway .env
echo "📦 Configuring gateway .env..."
cat << 'EOF' > gateway/.env
PORT=8000
NODE_ENV=production
AUTH_SERVICE_URL=http://localhost:6001
FEEDBACK_SERVICE_URL=http://localhost:6002
GATEWAY_INTERNAL_SECRET="rateprof_internal_gw_sec_2026_ti_campus"
CLERK_SECRET_KEY="sk_test_DwHkHkKtXXeg6CUjyLf7tTnxjqDPo2MD07pBVap8mO"
CLERK_PUBLISHABLE_KEY="pk_test_bWFueS1saW9uZmlzaC03NDE3LmNsZXJrLmFjY291bnRzLmRldiQ"
EOF

# 4. Install all dependencies and generate Prisma clients
echo "📦 Installing packages across microservices..."
npm run install:all
echo "🔧 Generating Prisma clients..."
cd auth-service && npx prisma generate && cd ..
cd feedback-microservice && npx prisma generate && cd ..

# 5. Start/Restart services with PM2
echo "⚡ Starting services with PM2..."
cd auth-service && pm2 delete campus-auth 2>/dev/null || true && pm2 start src/server.js --name "campus-auth" && cd ..
cd feedback-microservice && pm2 delete campus-feedback 2>/dev/null || true && pm2 start src/server.js --name "campus-feedback" && cd ..
cd gateway && pm2 delete campus-gateway 2>/dev/null || true && pm2 start src/server.js --name "campus-gateway" && cd ..

pm2 save

echo ""
echo "========================================================="
echo "✅ All 3 Campus Feedback microservices are running on AWS!"
echo "========================================================="
pm2 status
