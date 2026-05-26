import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { ArticleType } from '@prisma/client';
import { CreateArticleDto } from './dto/create-article.dto';

@Injectable()
export class ArticlesService {
  constructor(private prisma: PrismaService) {}

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
    return this.prisma.article.create({ data: dto });
  }

  async update(id: string, dto: Partial<CreateArticleDto>) {
    await this.findOne(id);
    return this.prisma.article.update({
      where: { id },
      data: {
        ...dto,
        publishedAt: dto.publishedAt ? new Date(dto.publishedAt) : undefined,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.article.delete({ where: { id } });
  }

  async feed(type?: string) {
    return this.prisma.article.findMany({
      where: {
        isPublished: true,
        ...(type ? { type: type as ArticleType } : {}),
      },
      include: {
        media: {
          orderBy: { sortOrder: 'asc' },
          take: 1,
        },
      },
      orderBy: [
        { type: 'asc' },
        { publishedAt: 'desc' },
      ],
    });
  }

  async detail(slug: string) {
    return this.prisma.article.findUnique({
      where: { slug },
      include: {
        media: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
  }
}
