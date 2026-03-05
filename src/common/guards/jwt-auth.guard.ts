import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { LoggerService } from '../../core/logger/logger.service';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private reflector: Reflector,
    private readonly logger: LoggerService,
  ) {
    super();
  }

  override canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      IS_PUBLIC_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }

  override handleRequest(
    err: any,
    user: any,
    _info: any,
    context: ExecutionContext,
  ) {
    const req = context.switchToHttp().getRequest();
    const requestId = req.requestId;

    if (err || !user) {
      this.logger.logInbound({
        requestId,
        method: req.method,
        url: req.url,
        headers: req.headers,
        query: req.query,
        params: req.params,
        body: req.body,
      });

      this.logger.logOutbound({
        requestId,
        method: req.method,
        url: req.url,
        statusCode: 401,
        durationMs: 0,
        response: {
          message: 'Unauthorized',
        },
        error: err?.stack
      });

      throw err || new UnauthorizedException();
    }

    return user;
  }
}
