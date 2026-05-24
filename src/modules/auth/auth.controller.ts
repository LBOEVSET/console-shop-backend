import {
  ForbiddenException,
  UnauthorizedException,
  Controller,
  Post,
  Body,
  Req,
  Res,
} from '@nestjs/common';
import { Request } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { AuthService } from './auth.service';
import { OtpService } from './otp.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Throttle } from '@nestjs/throttler';
import { randomUUID } from 'crypto';
import { Response } from 'express';
import { UseGuards } from '@nestjs/common';
import { RedisService } from 'src/core/redis/redis.service';
import { RequestContextService } from 'src/common/middleware/request-context.service';
import { VerifyOtpDto } from './dto/verifyOtp.dto';
import { JwtService } from '@nestjs/jwt';
import { JwtRegisterStrategy } from './strategies/jwt.registerStrategy';
import { AuthGuard } from '@nestjs/passport';

@UseGuards(JwtAuthGuard)
@Controller({
  path: 'auth',
  version: '1',
})
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly otpService: OtpService,
    private redis: RedisService,
    private readonly requestContext: RequestContextService,
    private jwtService: JwtService
  ) {}

  /**
   * Returns cookie options appropriate for the current environment.
   *
   * SameSite=None requires Secure=true (Chrome 80+ enforcement).
   * On local HTTP we use SameSite=Lax instead so cookies are stored.
   * On production (HTTPS, cross-origin) we use SameSite=None + Secure.
   */
  private cookieOpts(maxAge: number) {
    const isSecure = process.env.NODE_ENV !== 'local';
    return {
      httpOnly: true,
      secure: isSecure,
      sameSite: (isSecure ? 'none' : 'lax') as 'none' | 'lax',
      maxAge,
    };
  }

  @Public()
  @Post('guest/init')
  @Throttle({ auth: { limit: 5, ttl: 60 } })
  async initGuest(@Res({ passthrough: true }) res: Response) {
    const guestId = randomUUID();
    const tokens = await this.authService.initGuest(guestId);

    res.cookie('accessToken', tokens.accessToken, this.cookieOpts(15 * 60 * 1000));
    res.cookie('refreshToken', tokens.refreshToken, this.cookieOpts(7 * 24 * 60 * 60 * 1000));

    return { message: 'Guest session created' };
  }

  // @Public()
  // @Post('register')
  // @Throttle({ auth: { limit: 5, ttl: 60 } })
  // async register(
  //   @Body() dto: RegisterDto,
  //   @Res({ passthrough: true }) res: Response,
  // ) {
  //   const tokens = await this.authService.register(dto);

  //   res.cookie('accessToken', tokens.accessToken, {
  //     httpOnly: true,
  //     secure: process.env.NODE_ENV === 'local' ? false : true,
  //     sameSite: "none",
  //     maxAge: 15 * 60 * 1000,
  //   });

  //   res.cookie('refreshToken', tokens.refreshToken, {
  //     httpOnly: true,
  //     secure: process.env.NODE_ENV === 'local' ? false : true,
  //     sameSite: "none",
  //     maxAge: 7 * 24 * 60 * 60 * 1000,
  //   });

  //   return { message: 'Registered successfully' };
  // }

  @Post('register')
  @Throttle({ auth: { limit: 5, ttl: 60 } })
  async registerGuest(
    @Body() dto: RegisterDto,
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const guestId = req?.user?.guestId;
    const requestId = this.requestContext.get<string>('requestId');

    const userId = await this.authService.registerGuest(dto, guestId);

    const phoneE164Format = dto.phone;
    const uuid = randomUUID();
    const registerSession = await this.authService.generateRegisterSession(phoneE164Format, requestId!, uuid, userId, guestId);

    const otp = await this.otpService.sendOtp(phoneE164Format);
    await this.redis.set(`otp:${uuid}`, otp.request_id, 300);

    res.cookie('registerSession', registerSession, this.cookieOpts(60 * 1000));

    return { message: "OTP resent successfully" };
  }

  @Post('login')
  @Throttle({ auth: { limit: 5, ttl: 60 } })
  async login(
    @Req() req: any,
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const guestId = req?.user?.guestId;
    const tokens = await this.authService.login(dto, guestId);

    res.cookie('accessToken', tokens.accessToken, this.cookieOpts(15 * 60 * 1000));
    res.cookie('refreshToken', tokens.refreshToken, this.cookieOpts(7 * 24 * 60 * 60 * 1000));

    return { message: 'Login successful' };
  }

  @Public()
  @Post('refresh')
  @Throttle({ auth: { limit: 5, ttl: 60 } })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      throw new UnauthorizedException('No refresh token');
    }

    let data: any;
    try {
      data = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Guest tokens have id: '' and guestId set — there is no DB user record
    // to look up, so skip the rotation check and just re-issue a fresh guest
    // token pair using the same guestId embedded in the verified JWT.
    let tokens: { accessToken: string; refreshToken: string };
    if (!data.id && data.guestId) {
      tokens = await this.authService.initGuest(data.guestId);
    } else {
      tokens = await this.authService.refresh(data.id, refreshToken);
    }

    res.cookie('accessToken', tokens.accessToken, this.cookieOpts(15 * 60 * 1000));
    res.cookie('refreshToken', tokens.refreshToken, this.cookieOpts(7 * 24 * 60 * 60 * 1000));

    return { message: 'Refreshed' };
  }

  @Post('logout')
  @Throttle({ auth: { limit: 2, ttl: 60 } })
  logout(
    @Req() req: Request & { user: any },
    @Res({ passthrough: true }) res: Response,
  ) {
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    return this.authService.logout(req.user.id);
  }

  @UseGuards(AuthGuard('jwt-register'))
  @Post('send/otp')
  @Throttle({ auth: { limit: 1, ttl: 60 } })
  async resendOtp(
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const session: any = req.user;

    const phone = session.phone;
    const uuid = session.uuid;
    const requestId = session.requestId;
    const userId = session.userId;
    const guestId = session.guestId;

    const otp = await this.otpService.sendOtp(phone);

    await this.redis.set(`otp:${uuid}`, otp.request_id, 300);

    const newSession = await this.authService.generateRegisterSession(
      phone,
      requestId,
      uuid,
      userId,
      guestId,
    );

    res.cookie('registerSession', newSession, this.cookieOpts(60 * 1000));

    return { message: "OTP resent successfully" };
  }

  @UseGuards(AuthGuard('jwt-register'))
  @Post('verify/otp')
  @Throttle({ auth: { limit: 5, ttl: 60 } })
  async verifyOtp(
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
    @Body() dto: VerifyOtpDto
  ) {
    const registerSessionData: any = req.user;
    const otpRequestId = await this.redis.get(`otp:${registerSessionData.uuid}`);

    if (!otpRequestId) {
      throw new ForbiddenException('Invalid session');
    }

    const result = await this.otpService.verifyOtp(otpRequestId, dto.code);
    if (result.status !== "0") {
      throw new ForbiddenException('Invalid OTP');
    }

    const tokens = await this.authService.initUserCompleteRegistration(registerSessionData.userId, registerSessionData.guestId);

    res.cookie('accessToken', tokens.accessToken, this.cookieOpts(15 * 60 * 1000));
    res.cookie('refreshToken', tokens.refreshToken, this.cookieOpts(7 * 24 * 60 * 60 * 1000));

    res.clearCookie('guestId');
    res.clearCookie('registerSession');
    await this.redis.del(`otp:${registerSessionData.uuid}`);

    return { message: 'OTP verified successfully' };
  }

}
