import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Patch,
  Req,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { CreateReviewDto } from './dto/create-review.dto';
import { ModerateReviewDto } from './dto/moderate-review.dto';

@Controller({
  path: 'reviews',
  version: '1',
})
export class ReviewsController {
  constructor(private reviewsService: ReviewsService) {}

  @Roles(UserRole.CUSTOMER)
  @Post()
  create(@Req() req: any, @Body() dto: CreateReviewDto) {
    return this.reviewsService.create(req.user.id, dto);
  }

  @Get('product/:productId')
  getApproved(@Param('productId') productId: string) {
    return this.reviewsService.getApproved(productId);
  }

  @Roles(UserRole.ADMIN)
  @Patch(':id/moderate')
  moderate(
    @Param('id') id: string,
    @Body() dto: ModerateReviewDto,
  ) {
    return this.reviewsService.moderate(id, dto.isApproved);
  }
}
