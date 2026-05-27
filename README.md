# Console Shop — Backend API

REST API and WebSocket server for the Console Shop platform, built with NestJS + Prisma + PostgreSQL + Redis.

## Live URLs

| Service | URL |
|---|---|
| Customer storefront | [console-shop-web.lboevset.com](https://console-shop-web.lboevset.com) |
| Admin panel | [console-shop-admin.lboevset.com](https://console-shop-admin.lboevset.com) |
| API | [console-shop-api.lboevset.com/api/v1](https://console-shop-api.lboevset.com/api/v1) |

## Tech Stack

- **Framework:** NestJS (TypeScript)
- **Database:** PostgreSQL via Prisma ORM
- **Cache:** Redis
- **Auth:** JWT (access + refresh tokens), httpOnly cookies
- **Payments:** Omise
- **Realtime:** Socket.IO
- **Process manager:** PM2
- **Deployment:** GKE (Google Kubernetes Engine)

## Local Development

```bash
# Install dependencies
npm install

# Start in watch mode
npm run start:dev
```

Requires a `.env` file — copy `.env.example` and fill in the values.

## Deployment

Pushing to the `dev` branch triggers GitHub Actions to build, push to Artifact Registry, and roll out to GKE automatically.

See `console-shop-backend-config` for all Kubernetes manifests and the full deployment guide.
