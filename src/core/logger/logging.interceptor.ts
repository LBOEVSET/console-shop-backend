import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { LoggerService } from './logger.service';
import { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: LoggerService) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<any> {
    const start = Date.now();

    const http = context.switchToHttp();
    const req = http.getRequest<Request & { requestId?: string }>();
    const res = http.getResponse<Response>();

    const requestId = req.requestId;

    // Inbound logging disabled — too noisy
    // this.logger.logInbound({ requestId, method: req.method, url: req.url, ... });

    return next.handle().pipe(
      // Success responses: only log non-200 for visibility
      tap((_responseBody) => {
        // Disabled: this.logger.logOutbound(...)
      }),

      catchError((error) => {
        const duration = Date.now() - start;

        // Always log errors so they're visible in pm2 logs
        this.logger.logOutbound({
          requestId,
          url: req.url,
          statusCode: error?.status || 500,
          durationMs: duration,
          response: { message: error?.message },
          error: error?.stack,
        });

        return throwError(() => error);
      }),
    );
  }
}
