import { Injectable, NotFoundException } from '@nestjs/common';
import { RedisService } from '../../core/redis/redis.service';
import { PrismaService } from '../../core/prisma/prisma.service';

@Injectable()
export class CartService {
  constructor(
    private redis: RedisService,
    private prisma: PrismaService,
  ) {}

  private getKey(userId?: string, guestId?: string) {
    if (userId) return `cart:user:${userId}`;
    if (guestId) return `cart:guest:${guestId}`;
    throw new Error('Either userId or guestId must be provided');
  }

  async getCart(userId?: string, guestId?: string) {
    const cart = await this.redis.get(this.getKey(userId, guestId));

    if (!cart) return { items: [] };

    return JSON.parse(cart);
  }

  async addToCart(userId?: string, productId?: string, quantity?: number, guestId?: string) {
    const key = this.getKey(userId, guestId);

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        platform: true,
        media: true,
      },
    });

    if (!product || !product.isActive) {
      throw new NotFoundException('Product not found');
    }

    const existingCart = await this.getCart(userId, guestId);

    const existingItem = existingCart.items.find(
      (item: any) => item.productId === productId,
    );

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      existingCart.items.push({ productId, quantity, product });
    }

    await this.redis.set(key, JSON.stringify(existingCart), 60 * 15);

    return existingCart;
  }

  async updateCart(userId?: string, productId?: string, quantity?: number, guestId?: string) {
    const cart = await this.getCart(userId, guestId);

    cart.items = cart.items.map((item: any) =>
      item.productId === productId
        ? { ...item, quantity }
        : item,
    );

    await this.redis.set(this.getKey(userId, guestId), JSON.stringify(cart), 60 * 15);

    return cart;
  }

  async removeItem(userId?: string, productId?: string, guestId?: string) {
    const cart = await this.getCart(userId, guestId);

    cart.items = cart.items.filter(
      (item: any) => item.productId !== productId,
    );

    await this.redis.set(this.getKey(userId, guestId), JSON.stringify(cart), 60 * 15);

    return cart;
  }

  async clearCart(userId?: string, guestId?: string) {
    await this.redis.del(this.getKey(userId, guestId));

    return { message: 'Cart cleared' };
  }

  async convertGuestCart(guestId: string, userId: string) {
    const guestKey = `cart:guest:${guestId}`;
    const userKey = `cart:user:${userId}`;

    const guestCartRaw = await this.redis.get(guestKey);
    if (!guestCartRaw) return;

    const guestCart = JSON.parse(guestCartRaw);
    const userCartRaw = await this.redis.get(userKey);
    const userCart = userCartRaw ? JSON.parse(userCartRaw) : { items: [] };

    for (const guestItem of guestCart.items) {
      const existing = userCart.items.find(
        (i: any) => i.productId === guestItem.productId,
      );

      if (existing) {
        existing.quantity += guestItem.quantity;
      } else {
        userCart.items.push(guestItem);
      }
    }

    await this.redis.set(
      userKey,
      JSON.stringify(userCart),
      60 * 15,
    );

    await this.redis.del(guestKey);
  }

}
