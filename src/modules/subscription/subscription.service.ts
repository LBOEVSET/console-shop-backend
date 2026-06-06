import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from 'src/core/prisma/prisma.service';
import { RedisService } from 'src/core/redis/redis.service';
import { OrderStatus, PaymentStatus, Prisma } from '@prisma/client';

@Injectable()
export class SubscriptionService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  /** List all active plans (for frontend plan picker) */
  async getPlans() {
    return this.prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  /** List all plans including inactive (admin only) */
  async getAllPlans() {
    return this.prisma.subscriptionPlan.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  /**
   * Admin: grant a subscription plan to a user.
   * Creates a new ACTIVE SubscriptionTransaction.
   * Existing active transactions for the same user are left as-is
   * (admin can manually cancel if needed).
   */
  async grantSubscription(dto: {
    userId: string;
    planId: string;
    durationDays?: number;
    amountPaid?: number;
    note?: string;
  }) {
    const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!user) throw new NotFoundException('User not found.');

    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { id: dto.planId } });
    if (!plan) throw new NotFoundException('Plan not found.');

    const days = dto.durationDays ?? plan.durationDays;
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);

    const transaction = await this.prisma.subscriptionTransaction.create({
      data: {
        userId:     dto.userId,
        planId:     dto.planId,
        startDate,
        endDate,
        status:     'ACTIVE',
        amountPaid: dto.amountPaid ?? Number(plan.priceUsd),
        note:       dto.note,
      },
      include: { plan: true, user: { select: { id: true, email: true, username: true } } },
    });

    // Flush profile cache so the user sees the new subscription immediately
    await this.redis.del(`profile:${dto.userId}`);

    return transaction;
  }

  /** Admin: cancel a specific subscription transaction */
  async cancelSubscription(transactionId: string) {
    return this.prisma.subscriptionTransaction.update({
      where: { id: transactionId },
      data: { status: 'CANCELLED' },
    });
  }

  /** Admin: list all transactions with filters */
  async getTransactions(page = 1, limit = 20, userId?: string, status?: string) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (userId) where.userId = userId;
    if (status) where.status = status;

    const [transactions, total] = await this.prisma.$transaction([
      this.prisma.subscriptionTransaction.findMany({
        where,
        include: {
          plan: true,
          user: { select: { id: true, email: true, username: true, firstName: true, lastName: true, profileImage: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.subscriptionTransaction.count({ where }),
    ]);

    return { data: transactions, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /** List all spending tiers */
  async getTiers() {
    return this.prisma.spendingTier.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  // ─── Checkout flow ────────────────────────────────────────────────────────

  /**
   * Create an Order + Payment record for a subscription plan.
   * The payment gateway (Spring Boot) then processes the Omise charge normally.
   * Returns orderId so the frontend can redirect to payment.
   *
   * Exchange rate: subscription priceUsd is stored as USD. We bill in THB
   * using a fixed rate (1 USD = 35 THB) since Omise is THB-based.
   */
  async checkout(userId: string, dto: { planId: string; paymentMethod: string }) {
    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { id: dto.planId } });
    if (!plan || !plan.isActive) throw new NotFoundException('Subscription plan not found.');
    if (Number(plan.priceUsd) === 0) throw new BadRequestException('The Normal plan is free and does not require payment.');

    const THB_PER_USD = 35;
    const amountTHB = new Prisma.Decimal(Number(plan.priceUsd) * THB_PER_USD);
    const orderNumber = `SUB-${Date.now()}`;

    const order = await this.prisma.$transaction(async (tx) => {
      const o = await tx.order.create({
        data: {
          orderNumber,
          userId,
          subtotal: amountTHB,
          discount: 0,
          total: amountTHB,
          paymentMethod: dto.paymentMethod,
          status: OrderStatus.PENDING_PAYMENT,
        },
      });

      // Encode planId into the title so activate() can read it without schema change
      await tx.orderItem.create({
        data: {
          orderId: o.id,
          title: `__sub__${plan.id}`,   // sentinel: plan id
          price: amountTHB,
          quantity: 1,
        },
      });

      await tx.payment.create({
        data: {
          orderId: o.id,
          provider: 'OMISE',
          status: PaymentStatus.PENDING,
          amount: amountTHB,
          currency: 'THB',
        },
      });

      return o;
    });

    return { orderId: order.id };
  }

  /**
   * Called by the frontend after it detects the order is PAID.
   * Verifies the order belongs to the user, is a subscription order,
   * and hasn't already been activated, then grants the subscription.
   */
  async activate(userId: string, orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) throw new NotFoundException('Order not found.');
    if (order.userId !== userId) throw new ForbiddenException('Access denied.');
    if (order.status !== OrderStatus.PAID) throw new BadRequestException('Order is not paid yet.');
    if (!order.orderNumber.startsWith('SUB-')) throw new BadRequestException('Not a subscription order.');

    // Parse planId from sentinel item title
    const sentinel = order.items.find(i => i.title.startsWith('__sub__'));
    if (!sentinel) throw new BadRequestException('Subscription plan info not found in order.');
    const planId = sentinel.title.replace('__sub__', '');

    // Idempotency: don't double-grant for the same order
    const existing = await this.prisma.subscriptionTransaction.findFirst({
      where: { userId, planId, note: `order:${orderId}` },
    });
    if (existing) return { alreadyActivated: true, subscription: existing };

    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { id: planId } });
    if (!plan) throw new NotFoundException('Plan not found.');

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + plan.durationDays);

    const transaction = await this.prisma.subscriptionTransaction.create({
      data: {
        userId,
        planId,
        startDate,
        endDate,
        status: 'ACTIVE',
        amountPaid: new Prisma.Decimal(Number(plan.priceUsd)),
        note: `order:${orderId}`,
      },
      include: { plan: true },
    });

    // Flush the profile cache so the next GET /profile/me returns fresh subscription data
    await this.redis.del(`profile:${userId}`);

    return { alreadyActivated: false, subscription: transaction };
  }
}
