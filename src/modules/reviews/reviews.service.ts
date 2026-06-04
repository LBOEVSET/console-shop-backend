import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { RedisService } from '../../core/redis/redis.service';

const APPROVED_TTL = 60 * 2; // 2 minutes — shown on every product page

@Injectable()
export class ReviewsService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  private approvedKey(productId: string) {
    return `reviews:product:${productId}`;
  }

  async create(userId: string, dto: any) {
    const review = await this.prisma.review.create({
      data: {
        userId,
        productId: dto.productId,
        rating: dto.rating,
        comment: dto.comment,
      },
    });

    // New review → approved list may change once moderated
    // Bust now so stale counts don't linger
    await this.redis.del(this.approvedKey(dto.productId));

    return review;
  }

  /** Admin — list all reviews, paginated */
  async findAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.review.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, username: true, email: true } },
          product: { select: { id: true, title: true } },
        },
        skip,
        take: limit,
      }),
      this.prisma.review.count(),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /** Public — approved reviews for a product page (cached) */
  async getApproved(productId: string) {
    const key = this.approvedKey(productId);
    const cached = await this.redis.get(key);
    if (cached) return JSON.parse(cached);

    const reviews = await this.prisma.review.findMany({
      where: { productId, isApproved: true },
    });

    await this.redis.set(key, JSON.stringify(reviews), APPROVED_TTL);
    return reviews;
  }

  /** Admin — approve or reject a review */
  async moderate(reviewId: string, isApproved: boolean) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) throw new NotFoundException('Review not found');

    const updated = await this.prisma.review.update({
      where: { id: reviewId },
      data: { isApproved },
    });

    // Bust approved cache for that product
    await this.redis.del(this.approvedKey(review.productId));

    return updated;
  }
}
