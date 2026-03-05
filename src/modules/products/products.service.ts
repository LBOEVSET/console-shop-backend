import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { RedisService } from '../../core/redis/redis.service';
import { FindProductDto } from './dto/find-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    private prisma: PrismaService, 
    private redis: RedisService
) {}

  async create(dto: CreateProductDto) {
    const product = await this.prisma.product.create({
      data: dto,
    });

    // Invalidate cache
    await this.redis.del('products:all');

    return product;
  }

  async findAll(dto: FindProductDto) {
    try{
      const cacheKey = 'products:all';

      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const products = await this.prisma.product.findMany({
          include: {
            platform: true,
            categories: {
              select: {
                category: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                  },
                },
              },
            },
            media: true,
          },
      });

      const result = products.map((product: any) => ({
        ...product,
        categories: product.categories.map((c: any) => c.category),
      }));

      await this.redis.set(cacheKey, JSON.stringify(result), 5); // seconds

      return result;
    } catch (error) {
      console.error('Error fetching products:', error);
      throw new NotFoundException('Products not found');
    }
  }

  async findOne(id: string) {
    const cacheKey = `product:${id}`;

    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    let product: any = await this.prisma.product.findFirst({
      where: { 
        OR: [
          { id: id },
          { slug: id }
        ] 
      },
      include: {
        platform: true,
        categories: {
          select: {
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
        media: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const result = {
      ...product,
      categories: product.categories.map((c: any) => c.category),
    };

    this.redis.set(cacheKey, JSON.stringify(result), 5); // seconds

    return result;
  }
}
