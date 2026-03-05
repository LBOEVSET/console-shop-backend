import {
  Injectable,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { RedisService } from '../../core/redis/redis.service';
import { CheckoutDto } from './dto/checkout.dto';
import { Prisma, OrderStatus, PaymentStatus } from '@prisma/client';
import { OrderStateTransitions } from './enums/order-state.machine';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { OmiseService } from '../payments/omise.service';
import { CartService } from '../cart/cart.service';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private omiseService: OmiseService,
    private cartService: CartService,
  ) {}

  async checkout(userId: string, dto: CheckoutDto) {
    const cart = await this.cartService.getCart(userId);

    if (!cart) throw new BadRequestException('Cart is empty');

    if (!cart.items.length) throw new BadRequestException('Cart is empty');

    const productIds = cart.items.map((i: any) => i.productId);

    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, isActive: true },
    });

    let subtotal = new Prisma.Decimal(0);

    for (const item of cart.items) {
      const product = products.find(p => p.id === item.productId)!;

      if (product.stock < item.quantity) {
        throw new BadRequestException(
          `Insufficient stock for ${product.title}`,
        );
      }

      subtotal = subtotal.plus(
        product.price.mul(item.quantity),
      );
    }

    const total = subtotal;

    const orderNumber = `ORD-${Date.now()}`;

    const order = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          orderNumber,
          userId,
          subtotal,
          discount: 0,
          total,
          paymentMethod: dto.paymentMethod,
          status: OrderStatus.PENDING_PAYMENT,
        },
      });

      for (const item of cart.items) {
        const product = products.find(
          p => p.id === item.productId,
        )!;

        await tx.orderItem.create({
          data: {
            orderId: order.id,
            productId: product.id,
            title: product.title,
            price: product.price,
            quantity: item.quantity,
          },
        });

        await tx.product.update({
          where: { id: product.id },
          data: {
            stock: { decrement: item.quantity },
          },
        });
      }

      await tx.payment.create({
        data: {
          orderId: order.id,
          provider: 'OMISE',
          status: PaymentStatus.PENDING,
          amount: total,
          currency: 'THB',
        },
      });

      return order;
    });

    //!await this.cartService.clearCart(userId);

    /* ---------------------------- */
    /* PROMPTPAY FLOW              */
    /* ---------------------------- */

    if (dto.paymentMethod === 'PROMPTPAY') {
      const charge = await this.omiseService.createPromptPayCharge(
        Number(total),
        order.id,
      );

      await this.prisma.payment.update({
        where: { orderId: order.id },
        data: {
          chargeId: charge.id,
          rawPayload: charge,
        },
      });

      return {
        orderId: order.id,
        qrCode: charge.source?.scannable_code?.image?.download_uri,
      };
    }

    /* ---------------------------- */
    /* CARD FLOW                   */
    /* ---------------------------- */

    return {
      orderId: order.id,
    };
  }

  async updateOrderStatus(
    orderId: string,
    dto: UpdateOrderStatusDto,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const allowedTransitions =
      OrderStateTransitions[order.status];

    if (!allowedTransitions.includes(dto.status)) {
      throw new ForbiddenException(
        `Invalid status transition from ${order.status} to ${dto.status}`,
      );
    }

    return this.prisma.order.update({
      where: { id: orderId },
      data: { status: dto.status },
    });
  }

  async getMyOrders(userId: string) {
    const orders = await this.prisma.order.findMany({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              include: {
                media: {
                  where: { type: 'IMAGE' },
                  orderBy: { sortOrder: 'asc' },
                  take: 1,
                },
              },
            },
          },
        },
        payment: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return orders.map(order => ({
      ...order,
      item: order.items[0] ?? null,
      items: undefined,
    }));
  }

  async getAllOrders() {
    return this.prisma.order.findMany({
      include: {
        user: true,
        items: true,
        payment: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOrderById(orderId: string, userId: string) {
    const orders = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        userId,
      },
      include: {
        payment: true,
        items: {
          include: {
            product: {
              include: {
                media: {
                  where: { type: 'IMAGE' },
                  orderBy: { sortOrder: 'asc' },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });
    
    if (!orders) {
      return null;
    }

    return {
      ...orders,
      item: orders.items[0] ?? null,
      items: undefined,
    };
  }

}
