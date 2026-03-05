import { Global, Module } from '@nestjs/common';
import { LoggerService } from './logger.service';
import { LoggingInterceptor } from './logging.interceptor';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { RequestContextService } from 'src/common/middleware/request-context.service';

@Global()
@Module({
  providers: [
    LoggerService, 
    LoggingInterceptor,
    JwtAuthGuard,
    RolesGuard,
    PrismaService,
    RequestContextService
  ],
  exports: [
    LoggerService,
    LoggingInterceptor,
    JwtAuthGuard,
    RolesGuard,
    PrismaService,
    RequestContextService
  ],
})
export class LoggerModule {}
