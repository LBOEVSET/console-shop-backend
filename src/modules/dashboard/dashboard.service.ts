import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getOverview() {
    const revenue = await this.prisma.order.aggregate({
      _sum: { total: true },
      where: {
        status: OrderStatus.COMPLETED,
      },
    });

    const totalOrders = await this.prisma.order.count();

    const paidOrders = await this.prisma.order.count({
      where: {
        status: OrderStatus.PAID,
      },
    });

    const totalUsers = await this.prisma.user.count();

    const totalProducts = await this.prisma.product.count();

    return {
      revenue: revenue._sum.total || 0,
      totalOrders,
      paidOrders,
      totalUsers,
      totalProducts,
    };
  }

  async revenueByDay() {
    return this.prisma.$queryRaw`
      SELECT DATE("createdAt") as date,
             SUM(total) as revenue
      FROM "Order"
      WHERE status = 'COMPLETED'
      GROUP BY DATE("createdAt")
      ORDER BY DATE("createdAt") ASC
    `;
  }
}
