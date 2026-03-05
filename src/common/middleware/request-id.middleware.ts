import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { RequestContextService } from './request-context.service';

export function requestIdMiddleware(
  requestContext: RequestContextService,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const requestId = randomUUID();

    requestContext.run(() => {
      requestContext.set('requestId', requestId);
      next();
    }, new Map());
  };
}
