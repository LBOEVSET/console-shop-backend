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

  /**
   * Attaches tier and active subscription data to a raw user record.
   * Tier is computed from total PAID order spend.
   * Subscription is the most recent ACTIVE transaction that hasn't expired.
   */
  private async enrichProfile(user: any) {
    // ── Tier ──────────────────────────────────────────────────────────────────
    // Count all orders that resulted in a successful payment
    const totalSpendResult = await this.prisma.order.aggregate({
      where: {
        userId: user.id,
        status: { in: ['PAID', 'PROCESSING', 'SHIPPED', 'COMPLETED'] as any },
        // Exclude subscription orders — they are billed in THB and must not be counted as USD spend
        NOT: { orderNumber: { startsWith: 'SUB-' } },
      },
      _sum: { total: true },
    });
    const totalSpend = Number(totalSpendResult._sum.total ?? 0);

    const tiers = await this.prisma.spendingTier.findMany({ orderBy: { sortOrder: 'asc' } });
    let tier = tiers[0] ?? null; // default Bronze
    for (const t of tiers) {
      const min = Number(t.minSpend);
      const max = t.maxSpend != null ? Number(t.maxSpend) : Infinity;
      if (totalSpend >= min && totalSpend <= max) { tier = t; break; }
    }

    // ── Active subscription ────────────────────────────────────────────────────
    const now = new Date();
    const activeSub = await this.prisma.subscriptionTransaction.findFirst({
      where: {
        userId: user.id,
        status: 'ACTIVE',
        startDate: { lte: now },
        endDate:   { gte: now },
      },
      include: { plan: true },
      orderBy: { endDate: 'desc' },
    });

    return {
      ...user,
      totalSpend,
      tier,
      subscription: activeSub
        ? { plan: activeSub.plan, endDate: activeSub.endDate }
        : null,
    };
  }

  private profileKey(userId: string) { return `profile:${userId}`; }

  async getProfile(userId: string) {
    if (!userId) return null;

    const cached = await this.redis.get(this.profileKey(userId));
    if (cached) return JSON.parse(cached);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        addresses: true,
        _count: { select: { reviews: true } },
      },
    });

    if (!user) return null;

    // Count real orders (exclude SUB- subscription payments)
    const orderCount = await this.prisma.order.count({
      where: { userId, NOT: { orderNumber: { startsWith: 'SUB-' } } },
    });

    // Compute spending tier and active subscription, then attach to response
    const enriched = await this.enrichProfile({ ...user, _count: { ...user._count, orders: orderCount } });

    await this.redis.set(this.profileKey(userId), JSON.stringify(enriched), PROFILE_TTL);
    return enriched;
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
    // birthday: only settable if not already set (unchangeable)
    const current = await this.prisma.user.findUnique({ where: { id: userId }, select: { birthday: true } });
    const data: any = {
      firstName:       dto.firstName,
      lastName:        dto.lastName,
      phone:           dto.phone,
      profileImage:    dto.profileImage,
      backgroundImage: dto.backgroundImage,
    };
    if (dto.birthday && !current?.birthday) {
      data.birthday = new Date(dto.birthday);
    }

    const user = await this.prisma.user.update({ where: { id: userId }, data });
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

  // ─── Admin ────────────────────────────────────────────────────────────────

  async getAllUsers(page = 1, limit = 20, search?: string) {
    const skip = (page - 1) * limit;
    const where: any = search
      ? {
          OR: [
            { email:     { contains: search, mode: 'insensitive' } },
            { username:  { contains: search, mode: 'insensitive' } },
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName:  { contains: search, mode: 'insensitive' } },
          ],
        }
      : undefined;

    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          profileImage: true,
          birthday: true,
          role: true,
          status: true,
          createdAt: true,
          _count: { select: { orders: true } },
          subscriptionTransactions: {
            where: {
              status: 'ACTIVE',
              startDate: { lte: new Date() },
              endDate:   { gte: new Date() },
            },
            include: { plan: true },
            orderBy: { endDate: 'desc' },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    // Compute tier for each user from their order total
    const tiers = await this.prisma.spendingTier.findMany({ orderBy: { sortOrder: 'asc' } });

    const enriched = await Promise.all(users.map(async (u) => {
      const agg = await this.prisma.order.aggregate({
        where: {
          userId: u.id,
          status: { in: ['PAID', 'PROCESSING', 'SHIPPED', 'COMPLETED'] as any },
          NOT: { orderNumber: { startsWith: 'SUB-' } },
        },
        _sum: { total: true },
      });
      const spend = Number(agg._sum.total ?? 0);
      let tier = tiers[0] ?? null;
      for (const t of tiers) {
        const min = Number(t.minSpend);
        const max = t.maxSpend != null ? Number(t.maxSpend) : Infinity;
        if (spend >= min && spend <= max) { tier = t; break; }
      }
      const activeSub = u.subscriptionTransactions[0] ?? null;
      return {
        ...u,
        subscriptionTransactions: undefined,
        totalSpend: spend,
        tier,
        subscription: activeSub ? { plan: activeSub.plan, endDate: activeSub.endDate } : null,
      };
    }));

    return { data: enriched, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getUserById(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        profileImage: true,
        role: true,
        status: true,
        phone: true,
        createdAt: true,
        addresses: true,
        _count: { select: { orders: true, reviews: true, tickets: true } },
      },
    });
  }

  async updateUserStatus(userId: string, status: number) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { status },
      select: { id: true, status: true },
    });
  }
}
