import {
  Injectable,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import {
  PaymentStatus,
  OrderStatus,
} from '@prisma/client';
import { OmiseService } from './omise.service';

@Injectable()
export class PaymentsService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private omiseService: OmiseService,
  ) {}

  /* -------------------------------- */
  /* Webhook Signature Verification   */
  /* -------------------------------- */
  private verifySignature(
    rawBody: Buffer,
    signature: string,
  ) {
    const expected = createHmac(
      'sha256',
      this.config.getOrThrow('OMISE_WEBHOOK_SECRET'),
    )
      .update(rawBody)
      .digest('hex');

    if (expected !== signature) {
      throw new BadRequestException(
        'Invalid webhook signature',
      );
    }
  }

  /* -------------------------------- */
  /* Webhook Handler                  */
  /* -------------------------------- */
  async handleWebhook(
    rawBody: Buffer,
    signature: string,
  ) {
    this.verifySignature(rawBody, signature);

    const body = JSON.parse(rawBody.toString());
    const charge = body?.data;

    if (!charge?.id) {
      return { received: true };
    }

    const payment = await this.prisma.payment.findUnique({
      where: { chargeId: charge.id },
      include: { order: true },
    });

    if (!payment) {
      return { received: true };
    }

    if (
      payment.status === PaymentStatus.SUCCESSFUL ||
      payment.status === PaymentStatus.FAILED
    ) {
      return { received: true };
    }

    await this.prisma.$transaction(async (tx) => {
      /* ---------------------------- */
      /* SUCCESS CASE                */
      /* ---------------------------- */
      if (charge.status === 'successful') {
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.SUCCESSFUL,
            rawPayload: body,
          },
        });

        await tx.order.update({
          where: { id: payment.orderId },
          data: { status: OrderStatus.PAID },
        });
      }

      /* ---------------------------- */
      /* FAILED CASE                 */
      /* ---------------------------- */
      if (charge.status === 'failed') {
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.FAILED,
            rawPayload: body,
          },
        });

        await tx.order.update({
          where: { id: payment.orderId },
          data: { status: OrderStatus.FAILED },
        });

        // 🔥 RESTORE STOCK
        const items = await tx.orderItem.findMany({
          where: { orderId: payment.orderId },
        });

        for (const item of items) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              stock: { increment: item.quantity },
            },
          });
        }
      }
    });

    return { received: true };
  }

  /* -------------------------------- */
  /* Credit Card Payment              */
  /* -------------------------------- */
  async payWithCard(
    orderId: string,
    token: string,
    userId: string,
  ) {
    const payment = await this.prisma.payment.findUnique({
      where: { orderId },
      include: {
        order: true,
      },
    });

    if (!payment) {
      throw new BadRequestException('Payment not found');
    }

    if (payment.order.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    if (payment.status !== PaymentStatus.PENDING) {
      throw new BadRequestException(
        'Payment already processed',
      );
    }

    const charge =
      await this.omiseService.createCardCharge(
        Number(payment.amount),
        token,
        orderId,
      );

    if (!charge.paid) {
      throw new BadRequestException('Card payment failed');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.SUCCESSFUL,
          chargeId: charge.id,
          rawPayload: charge,
        },
      });

      await tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.PAID },
      });
    });

    return { success: true };
  }
}
