import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ArticlesService } from './articles.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { Public } from '../../common/decorators/public.decorator';

@Controller({
  path: 'articles',
  version: '1',
})
export class ArticlesController {
  constructor(private readonly service: ArticlesService) {}

  /** Admin — list all (including unpublished), filterable by type, paginated */
  @Roles(UserRole.ADMIN)
  @Get('admin/all')
  findAll(
    @Query('type') type?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.findAll(type, Number(page ?? 1), Number(limit ?? 20));
  }

  /** Admin — get single article by id */
  @Roles(UserRole.ADMIN)
  @Get('admin/:id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Roles(UserRole.ADMIN)
  @Post()
  create(@Body() dto: CreateArticleDto) {
    return this.service.create(dto);
  }

  @Roles(UserRole.ADMIN)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: Partial<CreateArticleDto>) {
    return this.service.update(id, dto);
  }

  @Roles(UserRole.ADMIN)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  /** Public — feed (published only), paginated */
  @Public()
  @Get()
  feed(
    @Query('type') type?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.feed(type, Number(page ?? 1), Number(limit ?? 12));
  }

  /** Public — article detail by slug */
  @Public()
  @Get(':slug')
  detail(@Param('slug') slug: string) {
    return this.service.detail(slug);
  }
}
