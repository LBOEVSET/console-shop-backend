import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { RedisService } from '../../core/redis/redis.service';
import { CreateMerchandiseDto } from './dto/create-merchandise.dto';
import { MediaType, MerchandiseType } from '@prisma/client';

const LIST_TTL   = 60 * 5;
const DETAIL_TTL = 60 * 5;

@Injectable()
export class MerchandiseService {
  constructor(
    private prisma: PrismaService,
    private redis:  RedisService,
  ) {}

  private listKey()               { return 'merchandise:list'; }
  private detailKey(slug: string) { return `merchandise:slug:${slug}`; }

  private async invalidate(slug?: string) {
    await this.redis.del(this.listKey());
    if (slug) await this.redis.del(this.detailKey(slug));
  }

  // ── Admin ─────────────────────────────────────────────────────────────────

  async findAll(filters?: { type?: MerchandiseType; isActive?: boolean; page?: number; limit?: number }) {
    const page  = filters?.page  ?? 1;
    const limit = filters?.limit ?? 20;
    const skip  = (page - 1) * limit;
    const where = {
      ...(filters?.type     !== undefined ? { type:     filters.type }     : {}),
      ...(filters?.isActive !== undefined ? { isActive: filters.isActive } : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.merchandise.findMany({
        where,
        include: { media: { orderBy: { sortOrder: 'asc' }, take: 1 } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.merchandise.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const item = await this.prisma.merchandise.findUnique({
      where:   { id },
      include: { media: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!item) throw new NotFoundException('Merchandise not found');
    return item;
  }

  async create(dto: CreateMerchandiseDto) {
    const { media, ...rest } = dto;
    const item = await this.prisma.merchandise.create({
      data: {
        ...rest,
        media: media?.length
          ? { create: media.map((m) => ({ type: m.type as MediaType, url: m.url, sortOrder: m.sortOrder })) }
          : undefined,
      },
      include: { media: true },
    });
    await this.invalidate(item.slug);
    return item;
  }

  async update(id: string, dto: Partial<CreateMerchandiseDto>) {
    const existing = await this.findOne(id);
    const { media, ...rest } = dto;

    const item = await this.prisma.merchandise.update({
      where: { id },
      data: {
        ...rest,
        ...(media !== undefined && {
          media: {
            deleteMany: {},
            create: media.map((m) => ({ type: m.type as MediaType, url: m.url, sortOrder: m.sortOrder })),
          },
        }),
      },
      include: { media: true },
    });

    await this.invalidate(existing.slug);
    if (item.slug !== existing.slug) await this.invalidate(item.slug);
    return item;
  }

  async remove(id: string) {
    const existing = await this.findOne(id);
    await this.prisma.merchandise.delete({ where: { id } });
    await this.invalidate(existing.slug);
    return { ok: true };
  }

  // ── Public (cached) ───────────────────────────────────────────────────────

  async publicList(type?: MerchandiseType, page = 1, limit = 12) {
    const skip  = (page - 1) * limit;
    const where = { isActive: true, ...(type ? { type } : {}) };
    const cacheKey = `merchandise:list:${type ?? 'all'}:p${page}`;

    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const [data, total] = await this.prisma.$transaction([
      this.prisma.merchandise.findMany({
        where,
        include: { media: { orderBy: { sortOrder: 'asc' }, take: 1 } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.merchandise.count({ where }),
    ]);
    const result = { data, total, page, limit, totalPages: Math.ceil(total / limit) };
    await this.redis.set(cacheKey, JSON.stringify(result), LIST_TTL);
    return result;
  }

  async publicDetail(slug: string) {
    const key    = this.detailKey(slug);
    const cached = await this.redis.get(key);
    if (cached) return JSON.parse(cached);

    const item = await this.prisma.merchandise.findUnique({
      where:   { slug },
      include: { media: { orderBy: { sortOrder: 'asc' } } },
    });

    if (!item || !item.isActive) throw new NotFoundException('Merchandise not found');
    await this.redis.set(key, JSON.stringify(item), DETAIL_TTL);
    return item;
  }
}
