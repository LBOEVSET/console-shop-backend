import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { Public } from 'src/common/decorators/public.decorator';
import { AuthService } from '../auth/auth.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { UseGuards } from '@nestjs/common';

@Controller({
  path: 'cart',
  version: '1',
})
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(
    private readonly cartService: CartService,
    private readonly authService: AuthService
  ) {}

  @Get()
  getCart(
    @Req() req: any,
  ) {
    const userId = req?.user?.id;
    const guestId = req?.user?.guestId;

    return this.cartService.getCart(userId, guestId);
  }

  @Post('add')
  addToCart(@Req() req: any, @Body() dto: AddToCartDto) {
    const userId = req?.user?.id;
    const guestId = req?.user?.guestId;

    return this.cartService.addToCart(
      userId,
      dto.productId,
      dto.quantity,
      guestId,
    );
  }

  @Patch('update')
  update(
    @Req() req: any,
    @Body() dto: AddToCartDto,
  ) {
    const userId = req?.user?.id;
    const guestId = req?.user?.guestId;

    return this.cartService.updateCart(
      userId,
      dto.productId,
      dto.quantity,
      guestId,
    );
  }

  @Patch('convert-guest-cart')
  convertGuestCart(@Req() req: any) {
    const userId = req?.user?.id;
    const guestId = req?.user?.guestId;

    return this.cartService.convertGuestCart(guestId, userId);
  }

  @Delete('remove/:productId')
  remove(@Req() req: any, @Param('productId') productId: string) {
    const userId = req?.user?.id;
    const guestId = req?.user?.guestId;

    return this.cartService.removeItem(
      userId,
      productId,
      guestId,
    );
  }

  @Delete('clear')
  clear(@Req() req: any) {
    const userId = req?.user?.id;
    const guestId = req?.user?.guestId;

    return this.cartService.clearCart(userId, guestId);
  }
}
