import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CheckoutDto } from './dto/checkout.dto';
import { EventCheckoutDto } from './dto/event-checkout.dto';
import { Prisma, OrderStatus, PaymentStatus } from '@prisma/client';
import { OrderStateTransitions } from './enums/order-state.machine';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { CartService } from '../cart/cart.service';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
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

    // Clear the cart now that the order is created and stock is reserved.
    // The frontend also clears on payment success, but doing it here ensures
    // the cart is gone even if the user closes the browser mid-payment.
    await this.cartService.clearCart(userId);

    // Always return only orderId. The frontend calls the payment gateway
    // directly for both CARD (/payments/card) and PROMPTPAY (/payments/promptpay).
    // Omise charges are created exclusively in the payment gateway service.
    return { orderId: order.id };
  }

  async eventCheckout(userId: string, dto: EventCheckoutDto) {
    const event = await this.prisma.event.findUnique({ where: { id: dto.eventId } });
    if (!event || !event.isActive) throw new NotFoundException('Event not found');
    if (event.stock < dto.quantity) throw new BadRequestException('Not enough tickets available');

    const total = new Prisma.Decimal(event.price).mul(dto.quantity);
    const orderNumber = `TKT-${Date.now()}`;

    const order = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          orderNumber,
          userId,
          subtotal: total,
          discount: 0,
          total,
          paymentMethod: dto.paymentMethod,
          status: OrderStatus.PENDING_PAYMENT,
        },
      });

      await tx.orderItem.create({
        data: {
          orderId: order.id,
          eventId: event.id,
          title: `${event.title} (Ticket)`,
          price: event.price,
          quantity: dto.quantity,
        },
      });

      await tx.event.update({
        where: { id: event.id },
        data: { stock: { decrement: dto.quantity } },
      });

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

    return { orderId: order.id };
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

  async getMyOrders(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    // Exclude internal subscription orders — these are THB payments, not product purchases
    const where = { userId, NOT: { orderNumber: { startsWith: 'SUB-' } } };
    const [orders, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
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
        skip,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    return { data: orders, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getAllOrders(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        include: { user: true, items: true, payment: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.order.count(),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
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

    return orders;
  }

}
