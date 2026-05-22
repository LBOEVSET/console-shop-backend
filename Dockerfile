# ---------- Builder ----------
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npx prisma generate

RUN npm run build

# ---------- Production ----------
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install --omit=dev

# Install PM2 globally so pm2-runtime is available as a binary
RUN npm install -g pm2

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/ecosystem.config.js ./ecosystem.config.js

# Create the logs directory that PM2 writes to
RUN mkdir -p logs

EXPOSE 3012

# pm2-runtime is the Docker-friendly PM2 entry point:
# it runs in the foreground, forwards SIGTERM/SIGINT correctly,
# and streams logs to stdout/stderr so `docker logs` works normally.
CMD ["pm2-runtime", "start", "ecosystem.config.js", "--only", "api"]