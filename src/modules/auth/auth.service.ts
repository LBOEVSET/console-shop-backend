import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import { UserRole } from '@prisma/client';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { CartService } from '../cart/cart.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private readonly cartService: CartService
  ) {}

  private async generateTokens(user?: any, guestId?: string) {
    const payload = {
      id: user?.id ?? '',
      guestId: guestId,
      email: user?.email ?? '',
      role: user?.role ?? 'CUSTOMER',
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: '15m',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: '7d',
    });

    return { accessToken, refreshToken };
  }

  async register(dto: RegisterDto) {
    const exists = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: dto.email },
          { username: dto.username }
        ]
      }
    })

    if (exists) {
      throw new BadRequestException("Email or username already taken")
    }

    const passwordHash = await bcrypt.hash(dto.password, 10)

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        username: dto.username,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        role: UserRole.CUSTOMER,
        status: 0
      }
    })

    return this.generateTokens(user)
  }

  async registerGuest(dto: any, guestId: string) {
    if (!guestId) {
      throw new BadRequestException('Guest session not found');
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new BadRequestException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    return this.prisma.$transaction(async (tx) => {
      // 1️⃣ Create real user
      const user = await tx.user.create({
        data: {
          email: dto.email,
          username: dto.username,
          passwordHash: hashedPassword,
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone,
          role: UserRole.CUSTOMER,
          status: 0,
        }
      });

      // 2️⃣ Migrate guest chat sessions
      await tx.chatSession.updateMany({
        where: { guestId },
        data: {
          customerId: user.id,
          guestId: null,
        },
      });

      // 3️⃣ Generate tokens
      const tokens = await this.generateTokens(user);

      const hashedRefreshToken = await bcrypt.hash(
        tokens.refreshToken,
        10,
      );

      // 4️⃣ Store hashed refresh token
      await tx.user.update({
        where: { id: user.id },
        data: { refreshToken: hashedRefreshToken },
      });

      return tokens;
    });
  }

  async login(dto: LoginDto, guestId: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: dto.identifier },
          { username: dto.identifier }
        ]
      }
    })

    if (!user) throw new UnauthorizedException("Invalid credentials")

    if (user.status == 0) {
      throw new UnauthorizedException("Account not approved yet")
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash ?? '')

    if (!valid) throw new UnauthorizedException("Invalid password")

    const tokens = await this.generateTokens(user);
    await this.cartService.convertGuestCart(guestId, user.id);
    return tokens;
  }

  async initGuest(guestId: string) {
    const tokens = await this.generateTokens(undefined, guestId);
    return tokens;
  }

  async refresh(userId: string, refreshToken: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.refreshToken) {
      throw new UnauthorizedException('Access denied');
    }

    const isValid = await bcrypt.compare(
      refreshToken,
      user.refreshToken,
    );

    if (!isValid) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Generate new tokens (ROTATION)
    const tokens = await this.generateTokens(user);

    const hashedRefreshToken = await bcrypt.hash(
      tokens.refreshToken,
      10,
    );

    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: hashedRefreshToken },
    });

    return tokens;
  }

  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });

    return { message: 'Logged out successfully' };
  }

}
