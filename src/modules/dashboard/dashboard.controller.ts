import {
  Controller,
  Get,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { DashboardService } from './dashboard.service';

@Controller({
  path: 'dashboard',
  version: '1',
})
@Roles(UserRole.ADMIN)
export class DashboardController {
  constructor(
    private readonly dashboardService: DashboardService,
  ) {}

  @Get('overview')
  overview() {
    return this.dashboardService.getOverview();
  }

  @Get('revenue-daily')
  revenueDaily() {
    return this.dashboardService.revenueByDay();
  }
}
