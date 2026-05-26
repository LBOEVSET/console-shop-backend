import { Module } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { ReviewsController } from './reviews.controller';

@Module({
  // RedisModule is @Global() — RedisService is available without importing here
  controllers: [ReviewsController],
  providers: [ReviewsService],
})
export class ReviewsModule {}
