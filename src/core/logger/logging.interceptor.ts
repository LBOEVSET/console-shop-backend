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

    // 🔹 INBOUND
    this.logger.logInbound({
      requestId,
      method: req.method,
      url: req.url,
      headers: req.headers,
      query: req.query,
      params: req.params,
      body: req.body,
    });

    return next.handle().pipe(
      tap((responseBody) => {
        const duration = Date.now() - start;

        this.logger.logOutbound({
          requestId,
          method: req.method,
          url: req.url,
          statusCode: res.statusCode,
          durationMs: duration,
          response: responseBody,
        });
      }),

      catchError((error) => {
        const duration = Date.now() - start;

        this.logger.logOutbound({
          requestId,
          statusCode: error?.status || 500,
          durationMs: duration,
          response: {
            message: error?.message,
          },
          error: error?.stack,
        });

        return throwError(() => error);
      }),
    );
  }
}
