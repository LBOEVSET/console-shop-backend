import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { RedisService } from '../../core/redis/redis.service';
import { FindProductDto } from './dto/find-product.dto';
import { Prisma } from '@prisma/client'

@Injectable()
export class ProductsService {
  constructor(
    private prisma: PrismaService, 
    private redis: RedisService
) {}

  async findAllPlatforms() {
    return this.prisma.platform.findMany({ orderBy: { name: 'asc' } });
  }

  async findAllCategories() {
    return this.prisma.category.findMany({ orderBy: { name: 'asc' } });
  }

  /**
   * Build a deterministic cache key from all filter params so that
   * different queries never share the same cached result.
   */
  private buildProductListCacheKey(dto: FindProductDto): string {
    const parts = [
      `p${dto.page ?? 1}`,
      `l${dto.limit ?? 10}`,
      dto.searchWord ? `q:${dto.searchWord}` : '',
      dto.platformId ? `plat:${dto.platformId}` : '',
      dto.categoryId ? `cat:${dto.categoryId}` : '',
      dto.inStock !== undefined ? `stock:${dto.inStock}` : '',
      dto.minPrice !== undefined ? `min:${dto.minPrice}` : '',
      dto.maxPrice !== undefined ? `max:${dto.maxPrice}` : '',
    ]
      .filter(Boolean)
      .join('|');

    return `products:list:${parts}`;
  }

  async create(dto: CreateProductDto) {
    const product = await this.prisma.product.create({
      data: dto,
    });

    // Invalidate all product list cache entries (pattern delete)
    const keys = await this.redis.getClient().keys('products:list:*');
    if (keys.length) {
      await this.redis.getClient().del(...keys);
    }

    return product;
  }

  async findAll(dto: FindProductDto) {
    try{
      const cacheKey = this.buildProductListCacheKey(dto);

      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const offset = dto.page ? (dto.page - 1) * (dto.limit || 10) : 0;
      const limit = dto.limit || 10;

      const conditions = await this.productListQueryBuilder(dto);
      let orderByClause = Prisma.sql`ORDER BY p."createdAt" DESC`;
      if(dto.searchWord){
        orderByClause = Prisma.sql`ORDER BY
          CASE
            WHEN COALESCE(${dto.searchWord}, '') <> ''
            THEN ts_rank(p.search, websearch_to_tsquery('english', ${dto.searchWord}))
          END DESC`;
      }

      const products: any[] = await this.prisma.$queryRaw`
        SELECT
          p.id,
          p.title,
          p.slug,
          p.description,
          p.stock,
          p."isActive",
          p."createdAt",
          p."updatedAt",
          p."platformId",
          pl.name AS "platformName",

          -- prices
          (
            SELECT COALESCE(json_agg(
              jsonb_build_object(
                'region', pp.region,
                'currency', pp.currency,
                'price', pp.price::float8,
                'salePrice', pp."salePrice"::float8
              )
            ), '[]')
            FROM "ProductPrice" pp
            WHERE pp."productId" = p.id
          ) AS prices,

          -- categories
          (
            SELECT COALESCE(json_agg(
              jsonb_build_object(
                'id', c.id,
                'name', c.name,
                'slug', c.slug
              )
            ), '[]')
            FROM "ProductCategory" pc
            JOIN "Category" c ON c.id = pc."categoryId"
            WHERE pc."productId" = p.id
          ) AS categories,

          -- media (single)
          (
            SELECT COALESCE(json_agg(
              jsonb_build_object(
                'id', pm.id,
                'productId', pm."productId",
                'type', pm.type,
                'url', pm.url
              )
            ), '[]')
            FROM "ProductMedia" pm
            WHERE pm."productId" = p.id
              AND pm.type = 'IMAGE'
          ) AS media

        FROM "Product" p
        LEFT JOIN "Platform" pl ON pl.id = p."platformId"
        WHERE ${Prisma.join(conditions, " AND ")}
        ${orderByClause}
        OFFSET ${offset}
        LIMIT ${limit};
      `;
      
      const result = products.map((product: any) => ({
        ...product,
        platform: {
          id: product.platformId,
          name: product.platformName,
        },
        prices: product.prices ?? [],
        categories: product.categories ?? [],
        media: product.media ?? [],
      }));

      await this.redis.set(cacheKey, JSON.stringify(result), 60); // 60 seconds

      return result;
    } catch (error) {
      throw new NotFoundException('Products not found');
    }
  }

  async update(id: string, dto: Partial<CreateProductDto>) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');

    const updated = await this.prisma.product.update({
      where: { id },
      data: dto,
    });

    // Bust single-item cache
    await this.redis.getClient().del(`product:${id}`);

    // Invalidate list cache
    const keys = await this.redis.getClient().keys('products:list:*');
    if (keys.length) await this.redis.getClient().del(...keys);

    return updated;
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

    this.redis.set(cacheKey, JSON.stringify(result), 5);

    return result;
  }


  async productListQueryBuilder(dto: FindProductDto): Promise<Prisma.Sql[]> {
    const conditions: Prisma.Sql[] = [
      Prisma.sql`p."isActive" = true`
    ];

    if (dto.searchWord) {
      conditions.push(
        Prisma.sql`p.search @@ websearch_to_tsquery('english', ${dto.searchWord})`
      )
    }

    if (dto.inStock !== undefined) {
      conditions.push(
        Prisma.sql`(p."stock" > 0) = ${dto.inStock}`
      )
    }

    if (dto.platformId) {
      conditions.push(
        Prisma.sql`p."platformId" = ${dto.platformId}`
      )
    }

    if (dto.minPrice) {
      conditions.push(
        Prisma.sql`(
          (p."salePrice" > 0 AND p."salePrice" >= ${dto.minPrice})
          OR
          (p."salePrice" = 0 AND p.price >= ${dto.minPrice})
        )`
      )
    }

    if (dto.maxPrice) {
      conditions.push(
        Prisma.sql`(
          (p."salePrice" > 0 AND p."salePrice" <= ${dto.maxPrice})
          OR
          (p."salePrice" = 0 AND p.price <= ${dto.maxPrice})
        )`
      )
    }

    if (dto.categoryId) {
      conditions.push(
        Prisma.sql`pc."categoryId" = ${dto.categoryId}`
      )
    }
    
    return conditions;
  }
}
