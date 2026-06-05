import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { RedisService } from '../../core/redis/redis.service';
import { FindProductDto } from './dto/find-product.dto';
import { Prisma } from '@prisma/client';


@Injectable()
export class ProductsService {
  constructor(
    private prisma: PrismaService, 
    private redis: RedisService
) {}

  async findAllPlatforms() {
    const KEY = 'platforms:all';
    const cached = await this.redis.get(KEY);
    if (cached) return JSON.parse(cached);

    const platforms = await this.prisma.platform.findMany({ orderBy: { name: 'asc' } });
    await this.redis.set(KEY, JSON.stringify(platforms), 60 * 60); // 1 hour
    return platforms;
  }

  async findAllCategories() {
    const KEY = 'categories:all';
    const cached = await this.redis.get(KEY);
    if (cached) return JSON.parse(cached);

    const categories = await this.prisma.category.findMany({ orderBy: { name: 'asc' } });
    await this.redis.set(KEY, JSON.stringify(categories), 60 * 60); // 1 hour
    return categories;
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
      dto.platform ? `plat:${dto.platform.toLowerCase()}` : '',
      dto.categoryIds?.length ? `cats:${[...dto.categoryIds].sort().join(',')}` : '',
      dto.inStock !== undefined ? `stock:${dto.inStock}` : '',
      dto.minPrice !== undefined ? `min:${dto.minPrice}` : '',
      dto.maxPrice !== undefined ? `max:${dto.maxPrice}` : '',
      dto.category ? `kind:${dto.category}` : '',
      dto.type ? `type:${dto.type}` : '',
    ]
      .filter(Boolean)
      .join('|');

    return `products:list:${parts}`;
  }

  async create(dto: CreateProductDto) {
    const product = await this.prisma.product.create({
      data: dto,
    });

    // Invalidate product list cache entries
    const keys = await this.redis.getClient().keys('products:list:*');
    if (keys.length) await this.redis.getClient().del(...keys);

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
      if (dto.searchWord) {
        const prefixQuery = dto.searchWord
          .trim()
          .split(/\s+/)
          .filter(Boolean)
          .map((w: string) => `${w}:*`)
          .join(' & ');
        orderByClause = Prisma.sql`ORDER BY
          ts_rank(p.search, to_tsquery('english', ${prefixQuery})) DESC,
          p."createdAt" DESC`;
      }

      const products: any[] = await this.prisma.$queryRaw`
        SELECT
          p.id,
          p.title,
          p.slug,
          p.description,
          p.stock,
          p."isActive",
          p.category,
          p.type,
          p."seeCount",
          p."viewCount",
          p."clickCount",
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
      // Re-throw known NestJS exceptions as-is
      if (error instanceof NotFoundException) throw error;
      // Log and rethrow unexpected errors rather than masking them as 404
      throw error;
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
      // Build a prefix-match tsquery: each token becomes "token:*" so
      // "slay" matches "Slayer", "sla" matches "Slayers", etc.
      // Falls back to a simple ILIKE if the word produces no ts tokens.
      const prefixQuery = dto.searchWord
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map(w => `${w}:*`)
        .join(' & ');
      conditions.push(
        Prisma.sql`(
          p.search @@ to_tsquery('english', ${prefixQuery})
          OR p.title ILIKE ${'%' + dto.searchWord + '%'}
        )`
      )
    }

    if (dto.inStock !== undefined) {
      conditions.push(
        Prisma.sql`(p."stock" > 0) = ${dto.inStock}`
      )
    }

    if (dto.platform) {
      conditions.push(
        Prisma.sql`LOWER(pl.name) = LOWER(${dto.platform})`
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

    if (dto.categoryIds && dto.categoryIds.length > 0) {
      // EXISTS subquery — product must belong to at least one of the selected categories
      conditions.push(
        Prisma.sql`EXISTS (
          SELECT 1 FROM "ProductCategory" pc
          WHERE pc."productId"::text = p.id::text
          AND pc."categoryId"::text = ANY(ARRAY[${Prisma.join(dto.categoryIds.map(id => Prisma.sql`${id}`))}])
        )`
      );
    }

    if (dto.category) {
      conditions.push(
        Prisma.sql`p.category = ${dto.category}::"ProductKind"`
      );
    }

    if (dto.type) {
      conditions.push(
        Prisma.sql`p.type ILIKE ${'%' + dto.type + '%'}`
      );
    }

    return conditions;
  }
}
