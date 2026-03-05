import {
  Controller,
  Post,
  Body,
  Req,
  Get,
  Param,
  Patch,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { OrdersService } from './orders.service';
import { CheckoutDto } from './dto/checkout.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

@Controller({
  path: 'orders',
  version: '1',
})
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // CUSTOMER
  @Roles(UserRole.CUSTOMER)
  @Post('checkout')
  checkout(@Req() req: any, @Body() dto: CheckoutDto) {
    return this.ordersService.checkout(req.user.id, dto);
  }

  @Roles(UserRole.CUSTOMER)
  @Get('my')
  getMyOrders(@Req() req: any) {
    console.log('req.headers');
    console.log(req.headers);
    return this.ordersService.getMyOrders(req.user.id);
  }

  // ADMIN
  @Roles(UserRole.ADMIN)
  @Get()
  getAllOrders() {
    return this.ordersService.getAllOrders();
  }

  @Get(':id')
  getOrder(
    @Req() req: any,
    @Param('id') id: string,
  ) {
    return this.ordersService.getOrderById(
      id,
      req.user.id,
    );
  }

  @Roles(UserRole.ADMIN)
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateOrderStatus(id, dto);
  }
}
