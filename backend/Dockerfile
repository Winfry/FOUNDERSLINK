# Built from the repository root (it needs data/seed):
#   docker build -f backend/Dockerfile .
FROM node:22-slim

RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci

COPY backend ./
COPY shared /app/shared
COPY data/seed /app/data/seed
# prisma.config.ts requires DATABASE_URL even to generate the client, which
# never connects. The real address comes from the environment at run time.
RUN DATABASE_URL=postgresql://build:build@localhost:5432/build npx prisma generate

EXPOSE 8000
# Apply migrations and load the compliance checklist, then start. Loading
# again on a restart is safe.
# LOAD_DEMO_DATA=false (a live server): no made-up funders and no demo
# accounts, whose shared password would let anyone in.
# Otherwise (docker compose, a demo server): the demo funders and the demo
# story's users too.
CMD npm run db:migrate \
 && if [ "$LOAD_DEMO_DATA" = "false" ]; then \
      npm run db:seed -- data/demo-compliance-items.json data/no-funders.json; \
    else \
      npm run db:seed -- data/demo-compliance-items.json ../data/seed/investors.json \
      && (npm run db:demo -- "$DEMO_PASSWORD" || echo "Demo users already exist"); \
    fi \
 && npm start
