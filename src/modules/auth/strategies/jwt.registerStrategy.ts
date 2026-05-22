import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtRegisterStrategy extends PassportStrategy(Strategy, 'jwt-register') {
  constructor() {
    const jwtSecret = process.env.JWT_REGISTER_SECRET;

    if (!jwtSecret) {
      throw new Error('JWT_REGISTER_SECRET environment variable is not defined');
    }

    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req) => req?.cookies?.registerSession
      ]),
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: any) {
    return {
      phone: payload.phone,
      requestId: payload.requestId,
      uuid: payload.uuid,
      userId: payload.userId,
      guestId: payload.guestId,
      iat: payload.iat,
      exp: payload.exp,
    };
  }
}
