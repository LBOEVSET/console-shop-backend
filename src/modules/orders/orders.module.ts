import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { CartService } from '../cart/cart.service';

@Module({
  controllers: [OrdersController],
  providers: [OrdersService, CartService],
})
export class OrdersModule {}
