import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/core/prisma/prisma.service';
import { RedisService } from '../../core/redis/redis.service';
import { CartService } from '../cart/cart.service';

const PROFILE_TTL = 60; // 60 seconds — short enough to reflect updates quickly

@Injectable()
export class ProfileService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private cartService: CartService,
  ) {}

  private profileKey(userId: string) { return `profile:${userId}`; }

  async getProfile(userId: string) {
    if (!userId) return null;

    const cached = await this.redis.get(this.profileKey(userId));
    if (cached) return JSON.parse(cached);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { addresses: true },
    });

    if (user) {
      await this.redis.set(this.profileKey(userId), JSON.stringify(user), PROFILE_TTL);
    }

    return user;
  }

  /**
   * Returns profile + cart in one DB/Redis round trip.
   * Used by GET /profile/me so the frontend can initialise with a single request.
   */
  async getMe(userId: string, guestId?: string) {
    const [profile, cart] = await Promise.all([
      this.getProfile(userId),
      this.cartService.getCart(userId || undefined, guestId || undefined),
    ]);
    return { profile, cart };
  }

  /** Invalidate cache after any mutation so the next GET is fresh. */
  private invalidate(userId: string) {
    return this.redis.del(this.profileKey(userId));
  }

  async updateProfile(userId: string, dto: any) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        profileImage: dto.profileImage,
        backgroundImage: dto.backgroundImage,
      },
    });
    await this.invalidate(userId);
    return user;
  }

  async deleteAccount(userId: string) {
    await this.prisma.user.delete({ where: { id: userId } });
    await this.invalidate(userId);
    return { message: 'Account deleted' };
  }

  async addAddress(userId: string, dto: any) {
    const address = await this.prisma.address.create({
      data: { ...dto, userId },
    });
    await this.invalidate(userId);
    return address;
  }

  async updateAddress(userId: string, addressId: string, dto: any) {
    const address = await this.prisma.address.update({
      where: { id: addressId },
      data: dto,
    });
    await this.invalidate(userId);
    return address;
  }

  async deleteAddress(userId: string, addressId: string) {
    const address = await this.prisma.address.delete({ where: { id: addressId } });
    await this.invalidate(userId);
    return address;
  }
}
