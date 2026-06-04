import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { RedisService } from '../../core/redis/redis.service';
import { CreateEventDto } from './dto/create-event.dto';
import { MediaType, ProductKind } from '@prisma/client';

const LIST_TTL   = 60 * 5;  // 5 min
const DETAIL_TTL = 60 * 5;

@Injectable()
export class EventsService {
  constructor(
    private prisma: PrismaService,
    private redis:  RedisService,
  ) {}

  private listKey()              { return 'events:list'; }
  private detailKey(slug: string) { return `event:slug:${slug}`; }

  private async invalidate(slug?: string) {
    await this.redis.del(this.listKey());
    if (slug) await this.redis.del(this.detailKey(slug));
  }

  // ── Admin ─────────────────────────────────────────────────────────────────

  async findAll(filters?: { category?: ProductKind; isActive?: boolean; page?: number; limit?: number }) {
    const page  = filters?.page  ?? 1;
    const limit = filters?.limit ?? 20;
    const skip  = (page - 1) * limit;
    const where = {
      ...(filters?.category !== undefined ? { category: filters.category } : {}),
      ...(filters?.isActive !== undefined ? { isActive: filters.isActive } : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.event.findMany({
        where,
        include: { media: { orderBy: { sortOrder: 'asc' }, take: 1 } },
        orderBy: { date: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.event.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: { media: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!event) throw new NotFoundException('Event not found');
    return event;
  }

  async create(dto: CreateEventDto) {
    const { media, ...rest } = dto;
    const event = await this.prisma.event.create({
      data: {
        ...rest,
        date: new Date(dto.date),
        media: media?.length
          ? { create: media.map((m) => ({ type: m.type as MediaType, url: m.url, sortOrder: m.sortOrder })) }
          : undefined,
      },
      include: { media: true },
    });
    await this.invalidate(event.slug);
    return event;
  }

  async update(id: string, dto: Partial<CreateEventDto>) {
    const existing = await this.findOne(id);
    const { media, ...rest } = dto;

    const event = await this.prisma.event.update({
      where: { id },
      data: {
        ...rest,
        date: rest.date ? new Date(rest.date) : undefined,
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
    if (event.slug !== existing.slug) await this.invalidate(event.slug);
    return event;
  }

  async remove(id: string) {
    const existing = await this.findOne(id);
    await this.prisma.event.delete({ where: { id } });
    await this.invalidate(existing.slug);
    return { ok: true };
  }

  // ── Public (cached) ───────────────────────────────────────────────────────

  async publicList(page = 1, limit = 12) {
    const skip  = (page - 1) * limit;
    const where = { isActive: true };

    if (page === 1) {
      const cached = await this.redis.get(this.listKey());
      if (cached) return JSON.parse(cached);
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.event.findMany({
        where,
        include: { media: { orderBy: { sortOrder: 'asc' }, take: 1 } },
        orderBy: { date: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.event.count({ where }),
    ]);
    const result = { data, total, page, limit, totalPages: Math.ceil(total / limit) };

    if (page === 1) await this.redis.set(this.listKey(), JSON.stringify(result), LIST_TTL);
    return result;
  }

  async publicDetail(slug: string) {
    const key    = this.detailKey(slug);
    const cached = await this.redis.get(key);
    if (cached) return JSON.parse(cached);

    const event = await this.prisma.event.findUnique({
      where:   { slug },
      include: { media: { orderBy: { sortOrder: 'asc' } } },
    });

    if (!event || !event.isActive) throw new NotFoundException('Event not found');
    await this.redis.set(key, JSON.stringify(event), DETAIL_TTL);
    return event;
  }
}
