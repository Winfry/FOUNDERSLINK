# Built from the repository root (it needs data/seed):
#   docker build -f backend/Dockerfile .
FROM node:22-slim

RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci

COPY backend ./
COPY data/seed /app/data/seed
RUN npx prisma generate

EXPOSE 8000
# Apply migrations, load the demo funders and compliance items, create the
# demo story's users, then start. Loading again on a restart is safe.
CMD npm run db:migrate \
 && npm run db:seed -- data/demo-compliance-items.json ../data/seed/investors.json \
 && (npm run db:demo -- "$DEMO_PASSWORD" || echo "Demo users already exist") \
 && npm start
