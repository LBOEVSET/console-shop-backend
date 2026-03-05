import { OrderStatus } from '@prisma/client';

export const OrderStateTransitions: Record<
  OrderStatus,
  OrderStatus[]
> = {
  PENDING_PAYMENT: ['PAID', 'FAILED', 'CANCELLED'],
  PAID: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
  FAILED: [],
};
