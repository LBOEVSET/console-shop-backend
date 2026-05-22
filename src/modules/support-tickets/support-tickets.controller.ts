import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Patch,
  Req,
} from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole, TicketStatus } from '@prisma/client';
import { SupportTicketsService } from './support-tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { ReplyTicketDto } from './dto/reply-ticket.dto';

@Controller({
  path: 'support-tickets',
  version: '1',
})
export class SupportTicketsController {
  constructor(
    private readonly supportTicketsService: SupportTicketsService,
  ) {}

  // CUSTOMER — Create ticket
  @Roles(UserRole.CUSTOMER)
  @Post()
  create(@Req() req: any, @Body() dto: CreateTicketDto) {
    return this.supportTicketsService.createTicket(
      req.user.id,
      dto.title,
      dto.description,
    );
  }

  // CUSTOMER — View own tickets
  @Roles(UserRole.CUSTOMER)
  @Get('my')
  getMy(@Req() req: any) {
    return this.supportTicketsService.getMyTickets(
      req.user.id,
    );
  }

  // ADMIN — View all tickets
  @Roles(UserRole.ADMIN)
  @Get()
  getAll() {
    return this.supportTicketsService.getAllTickets();
  }

  // Reply (both roles allowed)
  @Post(':id/reply')
  reply(
    @Param('id') id: string,
    @Body() dto: ReplyTicketDto,
    @Req() req: any,
  ) {
    return this.supportTicketsService.replyToTicket(
      id,
      req.user.role,
      dto.message,
    );
  }

  // ADMIN — Update status
  @Roles(UserRole.ADMIN)
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: TicketStatus,
  ) {
    return this.supportTicketsService.updateStatus(
      id,
      status,
    );
  }
}
