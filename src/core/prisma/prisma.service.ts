import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { LoggerService } from '../logger/logger.service';
import { RequestContextService } from 'src/common/middleware/request-context.service';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(
    private readonly logger: LoggerService,
    private readonly requestContext: RequestContextService
  ) {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      // Keep TCP connections alive so NAT/firewall doesn't silently drop
      // idle connections — prevents the 2-3s reconnect penalty on page reload.
      keepAlive: true,
      keepAliveInitialDelayMillis: 10_000,
      // Close truly idle connections after 60s (longer than default 10s)
      // so the pool doesn't unnecessarily churn during low traffic.
      idleTimeoutMillis: 60_000,
      max: 10,
    });

    super({
      adapter: new PrismaPg(pool),
      log: ['error', 'warn'],
    });

    // 🔥 IMPORTANT: assign extension back
    Object.assign(
      this,
      this.$extends({
        query: {
          $allModels: {
            async $allOperations({ model, operation, args, query }) {
              const requestId = requestContext.get<string>('requestId');
              const start = Date.now();

              // Log model + operation only — omit args and result to avoid
              // serialising potentially large payloads on every DB call.
              logger.logDbRequest({
                type: 'DB_REQUEST',
                requestId,
                db: 'postgres',
                model,
                action: operation,
              });

              const result = await query(args);

              const duration = Date.now() - start;

              logger.logDbResponse({
                type: 'DB_RESPONSE',
                requestId,
                db: 'postgres',
                model,
                action: operation,
                durationMs: duration,
              });

              return result;
            },
          },
        },
      }),
    );
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
