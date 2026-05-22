import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OmiseService } from '../payments/omise.service';
import { CartService } from '../cart/cart.service';

@Module({
  controllers: [OrdersController],
  providers: [OrdersService, OmiseService, CartService],
})
export class OrdersModule {}
