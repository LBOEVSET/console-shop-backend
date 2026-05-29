# ─────────────────────────────────────────────────────────────────────────────
# Stage 1 — Builder
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npx prisma generate
RUN npm run build

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2 — Production runner
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

# Install PM2 globally so pm2-runtime is available as a binary
RUN npm install -g pm2

# Copy built output and runtime deps from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/ecosystem.config.js ./ecosystem.config.js

# Create the logs directory that PM2 writes to
RUN mkdir -p logs

EXPOSE 3012

# Run pending Prisma migrations then start the API with PM2.
# DATABASE_URL must be set via k8s secret / env before this runs.
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && pm2-runtime start ecosystem.config.js --only api"]
