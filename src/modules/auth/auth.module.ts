import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { ConfigModule } from '@nestjs/config';
import { CartService } from '../cart/cart.service';
import { OtpService } from './otp.service';
import { RedisService } from 'src/core/redis/redis.service';
import { RequestContextService } from 'src/common/middleware/request-context.service';
import { JwtRegisterStrategy } from './strategies/jwt.registerStrategy';

@Module({
  imports: [
    ConfigModule.forRoot(),
    JwtModule.register({}),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtRegisterStrategy, CartService, RequestContextService, RedisService, OtpService],
})
export class AuthModule {}
