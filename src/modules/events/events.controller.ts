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
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { UserRole, ProductKind } from '@prisma/client';

@Controller({ path: 'events', version: '1' })
export class EventsController {
  constructor(private readonly service: EventsService) {}

  // ── Admin ──────────────────────────────────────────────────────────────────

  @Roles(UserRole.ADMIN)
  @Get('admin/all')
  findAll(
    @Query('category') category?: ProductKind,
    @Query('isActive') isActive?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.findAll({
      category,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      page: Number(page ?? 1),
      limit: Number(limit ?? 20),
    });
  }

  @Roles(UserRole.ADMIN)
  @Get('admin/:id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Roles(UserRole.ADMIN)
  @Post()
  create(@Body() dto: CreateEventDto) {
    return this.service.create(dto);
  }

  @Roles(UserRole.ADMIN)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: Partial<CreateEventDto>) {
    return this.service.update(id, dto);
  }

  @Roles(UserRole.ADMIN)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  // ── Public ─────────────────────────────────────────────────────────────────

  @Public()
  @Get()
  publicList(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.publicList(Number(page ?? 1), Number(limit ?? 12));
  }

  @Public()
  @Get(':slug')
  publicDetail(@Param('slug') slug: string) {
    return this.service.publicDetail(slug);
  }
}
