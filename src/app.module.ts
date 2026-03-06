import { Module } from '@nestjs/common';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { AuthModule } from './modules/auth/auth.module';
import { ProductsModule } from './modules/products/products.module';
import { PrismaModule } from './core/prisma/prisma.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from './modules/auth/strategies/jwt.strategy';
import { JwtModule } from '@nestjs/jwt';
import { RedisModule } from './core/redis/redis.module';
import { CartModule } from './modules/cart/cart.module';
import { OrdersModule } from './modules/orders/orders.module';
import { SupportTicketsModule } from './modules/support-tickets/support-tickets.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { THROTTLE_CONFIG } from 'throttler.config';
import { ProfileModule } from './modules/profile/profile.module';
import { LoggerModule } from './core/logger/logger.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { PaymentsModule } from './modules/payments/payments.module';
import { ArticlesModule } from './modules/articles/articles.module';
import { HealthCheckModule } from './modules/health-check/health-check.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    HealthCheckModule,
    PrismaModule,
    AuthModule,
    ProductsModule,
    RedisModule,
    CartModule,
    OrdersModule,
    SupportTicketsModule,
    DashboardModule,
    ProfileModule,
    PaymentsModule,
    ArticlesModule,
    LoggerModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: { expiresIn: '15m' },
      }),
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60,
        limit: 100,
      },
      {
        name: 'default',
        ...THROTTLE_CONFIG.DEFAULT,
      },
      {
        name: 'auth',
        ...THROTTLE_CONFIG.AUTH,
      },
    ]),
  ],
  controllers: [],
  providers: [
    JwtStrategy,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule {}
