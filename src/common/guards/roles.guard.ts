import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { LoggerService } from '../../core/logger/logger.service';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private readonly logger: LoggerService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    const req = context.switchToHttp().getRequest();
    const requestId = req.requestId;
    const user = req.user;

    if (!requiredRoles) {
      return true;
    }

    if (!user || !requiredRoles.includes(user.role)) {
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
        statusCode: 403,
        durationMs: 0,
        response: {
          message: 'Forbidden',
        },
      });

      throw new ForbiddenException('Access denied');
    }

    return true;
  }
}
