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
import { MerchandiseService } from './merchandise.service';
import { CreateMerchandiseDto } from './dto/create-merchandise.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { UserRole, MerchandiseType } from '@prisma/client';

@Controller({ path: 'merchandise', version: '1' })
export class MerchandiseController {
  constructor(private readonly service: MerchandiseService) {}

  // ── Admin ──────────────────────────────────────────────────────────────────

  @Roles(UserRole.ADMIN)
  @Get('admin/all')
  findAll(
    @Query('type')     type?:     MerchandiseType,
    @Query('isActive') isActive?: string,
  ) {
    return this.service.findAll({
      type,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
    });
  }

  @Roles(UserRole.ADMIN)
  @Get('admin/:id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Roles(UserRole.ADMIN)
  @Post()
  create(@Body() dto: CreateMerchandiseDto) {
    return this.service.create(dto);
  }

  @Roles(UserRole.ADMIN)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: Partial<CreateMerchandiseDto>) {
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
  publicList(@Query('type') type?: MerchandiseType) {
    return this.service.publicList(type);
  }

  @Public()
  @Get(':slug')
  publicDetail(@Param('slug') slug: string) {
    return this.service.publicDetail(slug);
  }
}
