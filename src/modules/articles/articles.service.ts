import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { Prisma, ArticleType } from '@prisma/client';

@Injectable()
export class ArticlesService {
  constructor(private prisma: PrismaService) {}

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