import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getOverview() {
    // Count revenue from all orders where payment was received
    // (PAID → PROCESSING → SHIPPED → COMPLETED). Excludes PENDING_PAYMENT,
    // CANCELLED, and FAILED which have not been paid.
    const PAID_STATUSES = [
      OrderStatus.PAID,
      OrderStatus.PROCESSING,
      OrderStatus.SHIPPED,
      OrderStatus.COMPLETED,
    ];

    const revenue = await this.prisma.order.aggregate({
      _sum: { total: true },
      where: {
        status: { in: PAID_STATUSES },
      },
    });

    const totalOrders = await this.prisma.order.count();

    const paidOrders = await this.prisma.order.count({
      where: {
        status: OrderStatus.PAID,
      },
    });

    const pendingOrders = await this.prisma.order.count({
      where: {
        status: OrderStatus.PENDING_PAYMENT,
      },
    });

    const totalUsers = await this.prisma.user.count();

    const totalProducts = await this.prisma.product.count();

    return {
      revenue: revenue._sum.total || 0,
      totalOrders,
      paidOrders,
      pendingOrders,
      totalUsers,
      totalProducts,
    };
  }

  async revenueByDay() {
    return this.prisma.$queryRaw`
      SELECT DATE("createdAt") as date,
             SUM(total) as revenue
      FROM "Order"
      WHERE status IN ('PAID', 'PROCESSING', 'SHIPPED', 'COMPLETED')
      GROUP BY DATE("createdAt")
      ORDER BY DATE("createdAt") ASC
    `;
  }
}
