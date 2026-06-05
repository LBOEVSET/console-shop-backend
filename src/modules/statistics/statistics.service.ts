import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { StatEntityType, StatEventType } from '@prisma/client';
import { CreateStatisticDto } from './dto/create-statistic.dto';

// Counter column map: entity type → prisma model key + counter field
const COUNTER_MAP: Record<
  StatEntityType,
  { model: string; seeField: string; viewField: string; clickField: string }
> = {
  PRODUCT:     { model: 'product',     seeField: 'seeCount', viewField: 'viewCount', clickField: 'clickCount' },
  ARTICLE:     { model: 'article',     seeField: 'seeCount', viewField: 'viewCount', clickField: 'clickCount' },
  EVENT:       { model: 'event',       seeField: 'seeCount', viewField: 'viewCount', clickField: 'clickCount' },
  MERCHANDISE: { model: 'merchandise', seeField: 'seeCount', viewField: 'viewCount', clickField: 'clickCount' },
};

@Injectable()
export class StatisticsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Record a SEE / VIEW / CLICK event.
   * - Inserts a row into Statistic for drill-down analytics.
   * - Increments the denormalized counter on the entity (fire-and-forget).
   * - Resolves IP geolocation in the background (ip-api.com, no API key needed).
   */
  async record(dto: CreateStatisticDto, ip?: string) {
    // 1. Insert stat row
    const stat = await this.prisma.statistic.create({
      data: {
        entityType: dto.entityType,
        entityId:   dto.entityId,
        eventType:  dto.eventType,
        userId:     dto.userId ?? null,
        guestId:    dto.guestId ?? null,
        ip:         ip ?? null,
      },
    });

    // 2. Increment denormalized counter (non-blocking)
    this.incrementCounter(dto.entityType, dto.entityId, dto.eventType).catch(
      () => { /* swallow — counter failure should never break the request */ },
    );

    // 3. Resolve IP geolocation in background and patch the stat row
    if (ip) {
      this.resolveGeo(stat.id, ip).catch(() => {});
    }

    return { ok: true };
  }

  /**
   * Batch-record multiple events in one request.
   * All stat rows are inserted with createMany in a single DB round-trip.
   * Counter increments and geo lookups still run fire-and-forget per event.
   */
  async recordBatch(dtos: CreateStatisticDto[], ip?: string) {
    if (!dtos?.length) return { ok: true, count: 0 };

    // One createMany for all rows — much cheaper than N individual inserts
    await this.prisma.statistic.createMany({
      data: dtos.map(dto => ({
        entityType: dto.entityType,
        entityId:   dto.entityId,
        eventType:  dto.eventType,
        userId:     dto.userId  ?? null,
        guestId:    dto.guestId ?? null,
        ip:         ip          ?? null,
      })),
    });

    // Counter increments — fire-and-forget, one per event
    for (const dto of dtos) {
      this.incrementCounter(dto.entityType, dto.entityId, dto.eventType).catch(() => {});
    }

    return { ok: true, count: dtos.length };
  }

  private async incrementCounter(
    entityType: StatEntityType,
    entityId:   string,
    eventType:  StatEventType,
  ) {
    const field =
      eventType === 'SEE'   ? 'seeCount'   :
      eventType === 'VIEW'  ? 'viewCount'  :
      'clickCount';

    const model = COUNTER_MAP[entityType].model;
    // Prisma dynamic model access via bracket notation
    await (this.prisma as any)[model].update({
      where: { id: entityId },
      data:  { [field]: { increment: 1 } },
    });
  }

  /** Returns true for loopback / RFC-1918 / link-local addresses. */
  private isPrivateIp(ip: string): boolean {
    return (
      ip === '127.0.0.1' ||
      ip === '::1' ||
      ip.startsWith('10.') ||
      ip.startsWith('192.168.') ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(ip) ||
      ip.startsWith('169.254.')
    );
  }

  private async resolveGeo(statId: string, ip: string) {
    // Skip private/loopback IPs — ip-api.com returns "private range" for these
    // and the round-trip adds latency with no useful data returned.
    if (this.isPrivateIp(ip)) return;

    try {
      const res = await fetch(
        `http://ip-api.com/json/${ip}?fields=status,country,regionName,city,lat,lon,org`,
        { signal: AbortSignal.timeout(3000) },
      );
      if (!res.ok) return;
      const data = await res.json();
      if (data.status !== 'success') return;

      await this.prisma.statistic.update({
        where: { id: statId },
        data:  { addressMetadata: data },
      });
    } catch {
      // network error or timeout — silently ignore
    }
  }

  // ── Admin query ─────────────────────────────────────────────────────────────

  async findAll(filters: {
    entityType?: StatEntityType;
    entityId?:   string;
    eventType?:  StatEventType;
    from?:       string;
    to?:         string;
    page?:       number;
    limit?:      number;
  }) {
    const page  = Number(filters.page  ?? 1);
    const limit = Number(filters.limit ?? 50);
    const skip  = (page - 1) * limit;

    const where: any = {};
    if (filters.entityType) where.entityType = filters.entityType;
    if (filters.entityId)   where.entityId   = filters.entityId;
    if (filters.eventType)  where.eventType  = filters.eventType;
    if (filters.from || filters.to) {
      where.createdAt = {};
      if (filters.from) where.createdAt.gte = new Date(filters.from);
      if (filters.to)   where.createdAt.lte = new Date(filters.to);
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.statistic.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.statistic.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  /**
   * Aggregate counters for an entity — grouped by eventType + day.
   * Useful for the admin chart: e.g. daily SEE/VIEW/CLICK over the last 30 days.
   */
  async aggregate(filters: {
    entityType: StatEntityType;
    entityId:   string;
    from?:      string;
    to?:        string;
  }) {
    const from = filters.from ? new Date(filters.from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const to   = filters.to   ? new Date(filters.to)   : new Date();

    // Raw SQL for daily grouping — Prisma doesn't support DATE_TRUNC natively
    const rows = await this.prisma.$queryRaw<
      { day: Date; eventType: StatEventType; count: bigint }[]
    >`
      SELECT
        DATE_TRUNC('day', "createdAt") AS day,
        "eventType",
        COUNT(*) AS count
      FROM "Statistic"
      WHERE "entityType" = ${filters.entityType}::"StatEntityType"
        AND "entityId"   = ${filters.entityId}
        AND "createdAt" >= ${from}
        AND "createdAt" <= ${to}
      GROUP BY day, "eventType"
      ORDER BY day ASC
    `;

    return rows.map((r) => ({
      day:       r.day,
      eventType: r.eventType,
      count:     Number(r.count),
    }));
  }
}
