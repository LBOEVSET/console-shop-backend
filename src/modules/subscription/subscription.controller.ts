import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Req,
} from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller({ path: 'subscription', version: '1' })
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  /** GET /subscription/plans — public, lists active plans */
  @Get('plans')
  getPlans() {
    return this.subscriptionService.getPlans();
  }

  /** GET /subscription/tiers — public, lists spending tiers */
  @Get('tiers')
  getTiers() {
    return this.subscriptionService.getTiers();
  }

  /** POST /subscription/checkout — authenticated, creates order + payment for a plan */
  @Post('checkout')
  checkout(
    @Req() req: any,
    @Body() dto: { planId: string; paymentMethod: string },
  ) {
    return this.subscriptionService.checkout(req.user.id, dto);
  }

  /** POST /subscription/activate — authenticated, grants subscription after payment */
  @Post('activate')
  activate(
    @Req() req: any,
    @Body('orderId') orderId: string,
  ) {
    return this.subscriptionService.activate(req.user.id, orderId);
  }

  // ─── Admin ────────────────────────────────────────────────────────────────

  @Roles(UserRole.ADMIN)
  @Get('admin/plans')
  getAllPlans() {
    return this.subscriptionService.getAllPlans();
  }

  @Roles(UserRole.ADMIN)
  @Get('admin/transactions')
  getTransactions(
    @Query('page')   page?:   string,
    @Query('limit')  limit?:  string,
    @Query('userId') userId?: string,
    @Query('status') status?: string,
  ) {
    return this.subscriptionService.getTransactions(
      Number(page ?? 1),
      Number(limit ?? 20),
      userId,
      status,
    );
  }

  @Roles(UserRole.ADMIN)
  @Post('admin/grant')
  grantSubscription(
    @Body() dto: {
      userId: string;
      planId: string;
      durationDays?: number;
      amountPaid?: number;
      note?: string;
    },
  ) {
    return this.subscriptionService.grantSubscription(dto);
  }

  @Roles(UserRole.ADMIN)
  @Patch('admin/transactions/:id/cancel')
  cancelSubscription(@Param('id') id: string) {
    return this.subscriptionService.cancelSubscription(id);
  }
}
