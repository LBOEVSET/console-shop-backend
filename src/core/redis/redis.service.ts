import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '../logger/logger.service';
import { RequestContextService } from 'src/common/middleware/request-context.service';

@Injectable()
export class RedisService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly baseLog = new Logger(RedisService.name);
  private client: Redis;

  constructor(
    private config: ConfigService, 
    private readonly logger: LoggerService,
    private readonly requestContext: RequestContextService
  ) {
    const redisUrl = this.config.get<string>('REDIS_URL');

    if (redisUrl) {
      this.client = new Redis(redisUrl, {
        lazyConnect: true,
        maxRetriesPerRequest: 3,
      });
    } else {
      this.client = new Redis({
        host: this.config.get<string>('REDIS_HOST', 'localhost'),
        port: this.config.get<number>('REDIS_PORT', 6379),
        password: this.config.get<string>('REDIS_PASSWORD'),
        lazyConnect: true,
        maxRetriesPerRequest: 3,
      });
    }

    this.client.on('error', (err) => {
      this.baseLog.error('Redis error', err);
    });
  }

  async onModuleInit() {
    await this.client.connect();
    this.baseLog.log('Redis connected');
  }

  async onModuleDestroy() {
    await this.client.quit();
    this.baseLog.log('Redis disconnected');
  }

  // 🔥 DO NOT CHANGE THIS (backward compatibility)
  getClient(): Redis {
    return this.client;
  }

  // Optional helpers (won’t break anything)

  async get(key: string) {
    const requestId = this.requestContext.get<string>('requestId');
    this.logger.logCacheRequest({ requestId, action: 'GET', key });

    const start = Date.now();
    const result = await this.client.get(key);
    const duration = Date.now() - start;
    
    if (result) {
      this.logger.logCacheHit({ requestId, key, durationMs: duration, data: result });
    } else {
      this.logger.logCacheMiss({ requestId, key, durationMs: duration });
    }

    return result;
  }

  async set(key: string, value: string, ttl?: number) {
    const requestId = this.requestContext.get<string>('requestId');
    const start = Date.now();

    if (ttl) {
      await this.client.set(key, value, 'EX', ttl);``
    } else {
      await this.client.set(key, value);
    }

    const duration = Date.now() - start;

    this.logger.logCacheSet({
      requestId,
      key,
      ttl,
      durationMs: duration,
      data: value
    });
  }

  async del(key: string) {
    const requestId = this.requestContext.get<string>('requestId');
    const start = Date.now();

    await this.client.del(key);
    const duration = Date.now() - start;

    this.logger.logCacheDelete({
      requestId,
      key,
      durationMs: duration,
    });
  }
}
