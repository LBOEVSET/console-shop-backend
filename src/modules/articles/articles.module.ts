import { Module } from '@nestjs/common';
import { ArticlesController } from './articles.controller';
import { ArticlesService } from './articles.service';

@Module({
  // RedisModule is @Global() — RedisService is available without importing here
  controllers: [ArticlesController],
  providers: [ArticlesService],
})
export class ArticlesModule {}
