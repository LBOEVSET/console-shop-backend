import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { RedisService } from '../../core/redis/redis.service';
import { ArticleType } from '@prisma/client';
import { CreateArticleDto } from './dto/create-article.dto';

// TTLs
const FEED_TTL  = 60 * 5;   // 5 minutes — public article list
const DETAIL_TTL = 60 * 5;  // 5 minutes — single article by slug

@Injectable()
export class ArticlesService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  private feedKey(type?: string) {
    return `articles:feed:${type ?? 'all'}`;
  }

  private detailKey(slug: string) {
    return `article:slug:${slug}`;
  }

  /** Bust all feed cache keys (any type filter) and optionally a single detail */
  private async invalidate(slug?: string) {
    const feedKeys = await this.redis.getClient().keys('articles:feed:*');
    if (feedKeys.length) await this.redis.getClient().del(...feedKeys);
    if (slug) await this.redis.del(this.detailKey(slug));
  }

  // ── Admin routes (no cache — admins need live data) ──────────────────────

  /** Admin — all articles including unpublished */
  async findAll(type?: string) {
    return this.prisma.article.findMany({
      where: type ? { type: type as ArticleType } : {},
      include: {
        media: { orderBy: { sortOrder: 'asc' }, take: 1 },
      },
      orderBy: [{ type: 'asc' }, { publishedAt: 'desc' }],
    });
  }

  /** Admin — single article by id */
  async findOne(id: string) {
    const article = await this.prisma.article.findUnique({
      where: { id },
      include: { media: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!article) throw new NotFoundException('Article not found');
    return article;
  }

  async create(dto: CreateArticleDto) {
    const article = await this.prisma.article.create({ data: dto });
    await this.invalidate(article.slug);
    return article;
  }

  async update(id: string, dto: Partial<CreateArticleDto>) {
    const existing = await this.findOne(id);
    const article = await this.prisma.article.update({
      where: { id },
      data: {
        ...dto,
        publishedAt: dto.publishedAt ? new Date(dto.publishedAt) : undefined,
      },
    });
    // Invalidate both old slug and new slug (in case slug changed)
    await this.invalidate(existing.slug);
    if (article.slug !== existing.slug) await this.invalidate(article.slug);
    return article;
  }

  async remove(id: string) {
    const existing = await this.findOne(id);
    const result = await this.prisma.article.delete({ where: { id } });
    await this.invalidate(existing.slug);
    return result;
  }

  // ── Public routes (cached) ────────────────────────────────────────────────

  async feed(type?: string) {
    const key = this.feedKey(type);
    const cached = await this.redis.get(key);
    if (cached) return JSON.parse(cached);

    const articles = await this.prisma.article.findMany({
      where: {
        isPublished: true,
        ...(type ? { type: type as ArticleType } : {}),
      },
      include: {
        media: { orderBy: { sortOrder: 'asc' }, take: 1 },
      },
      orderBy: [{ type: 'asc' }, { publishedAt: 'desc' }],
    });

    await this.redis.set(key, JSON.stringify(articles), FEED_TTL);
    return articles;
  }

  async detail(slug: string) {
    const key = this.detailKey(slug);
    const cached = await this.redis.get(key);
    if (cached) return JSON.parse(cached);

    const article = await this.prisma.article.findUnique({
      where: { slug },
      include: { media: { orderBy: { sortOrder: 'asc' } } },
    });

    if (article) {
      await this.redis.set(key, JSON.stringify(article), DETAIL_TTL);
    }

    return article;
  }
}
