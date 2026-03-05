import { Injectable } from '@nestjs/common';
import pino from 'pino';

@Injectable()
export class LoggerService {
  private logger = pino({
    level: 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
      },
    },
  });

  logInbound(data: any) {
    this.logger.info({ type: 'IN_BOUND', ...data });
  }

  logOutbound(data: any) {
    this.logger.info({ type: 'OUT_BOUND', ...data });
  }

  logAppLogic(data: any) {
    this.logger.info({ type: 'APP_LOGIC', ...data });
  }

  logDbRequest(data: any) {
    this.logger.info({ type: 'DB_REQUEST', ...data });
  }

  logDbResponse(data: any) {
    this.logger.info({ type: 'DB_RESPONSE', ...data });
  }

  logCacheRequest(data: any) {
    this.logger.info({
      type: 'CACHE_REQUEST',
      ...data,
    });
  }

  logCacheHit(data: any) {
    this.logger.info({
      type: 'CACHE_HIT',
      ...data,
    });
  }

  logCacheMiss(data: any) {
    this.logger.warn({
      type: 'CACHE_MISS',
      ...data,
    });
  }

  logCacheSet(data: any) {
    this.logger.info({
      type: 'CACHE_SET',
      ...data,
    });
  }

  logCacheDelete(data: any) {
    this.logger.info({
      type: 'CACHE_DELETE',
      ...data,
    });
  }

  error(error: any, url: string) {
    this.logger.error({
      type: 'EXCEPTION',
      url: url,
      ...error,
      error: error.stack,
    });
  }
}
