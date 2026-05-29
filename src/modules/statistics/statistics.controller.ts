import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Ip,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { StatisticsService } from './statistics.service';
import { CreateStatisticDto } from './dto/create-statistic.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { UserRole, StatEntityType, StatEventType } from '@prisma/client';

@Controller({ path: 'statistics', version: '1' })
export class StatisticsController {
  constructor(private readonly service: StatisticsService) {}

  /** Public — record a SEE / VIEW / CLICK event */
  @Public()
  @Post()
  @HttpCode(HttpStatus.OK)
  record(
    @Body() dto: CreateStatisticDto,
    @Ip() ip: string,
  ) {
    // Strip IPv4-mapped IPv6 prefix (::ffff:x.x.x.x → x.x.x.x)
    const cleanIp = ip?.replace(/^::ffff:/, '') ?? undefined;
    return this.service.record(dto, cleanIp);
  }

  /** Admin — paginated raw event list */
  @Roles(UserRole.ADMIN)
  @Get()
  findAll(
    @Query('entityType') entityType?: StatEntityType,
    @Query('entityId')   entityId?:   string,
    @Query('eventType')  eventType?:  StatEventType,
    @Query('from')       from?:       string,
    @Query('to')         to?:         string,
    @Query('page')       page?:       number,
    @Query('limit')      limit?:      number,
  ) {
    return this.service.findAll({ entityType, entityId, eventType, from, to, page, limit });
  }

  /** Admin — daily aggregates for charting */
  @Roles(UserRole.ADMIN)
  @Get('aggregate')
  aggregate(
    @Query('entityType') entityType: StatEntityType,
    @Query('entityId')   entityId:   string,
    @Query('from')       from?:      string,
    @Query('to')         to?:        string,
  ) {
    return this.service.aggregate({ entityType, entityId, from, to });
  }
}
