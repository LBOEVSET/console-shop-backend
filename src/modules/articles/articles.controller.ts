import { Controller, Get, Param, Query } from '@nestjs/common';
import { ArticlesService } from './articles.service';

@Controller({
  path: 'articles',
  version: '1',
})
export class ArticlesController {
  constructor(private readonly service: ArticlesService) {}

  @Get()
  async feed(@Query('type') type?: string) {
    return this.service.feed(type);
  }

  @Get(':slug')
  async detail(@Param('slug') slug: string) {
    return this.service.detail(slug);
  }
}