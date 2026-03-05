import {
  Controller,
  Post,
  Req,
  Headers,
  Body,
} from '@nestjs/common';
import { Request } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller({
  path: 'payments',
  version: '1',
})
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
  ) {}

  @Post('card')
  async payWithCard(
    @Req() req: any,
    @Body() body: { orderId: string; token: string },
  ) {
    console.log(req.user);
    return this.paymentsService.payWithCard(
      body.orderId,
      body.token,
      req.user.id
    );
  }

  @Public()
  @Post('webhook')
  async handleWebhook(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('x-omise-signature') signature: string,
  ) {
    return this.paymentsService.handleWebhook(
      req.rawBody!,
      signature,
    );
  }
}
