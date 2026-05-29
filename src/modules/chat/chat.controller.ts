import { Controller, Get, Post, Param, Query, Req } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole, ChatStatus } from '@prisma/client';
import { ChatService } from './chat.service';

@Controller({ path: 'chat', version: '1' })
export class ChatController {
  constructor(private chatService: ChatService) {}

  /** Customer: open a new support session */
  @Roles(UserRole.CUSTOMER)
  @Post('start')
  start(@Req() req: any) {
    return this.chatService.createSession(req.user.id);
  }

  /** Admin: pull next WAITING session off the queue and mark ACTIVE */
  @Roles(UserRole.ADMIN)
  @Post('assign')
  assign(@Req() req: any) {
    return this.chatService.assignNext(req.user.id);
  }

  /** Admin: list sessions, optionally filtered by status */
  @Roles(UserRole.ADMIN)
  @Get('sessions')
  getSessions(@Query('status') status?: ChatStatus) {
    return this.chatService.getSessions(status);
  }

  /** Admin: message history for one session */
  @Roles(UserRole.ADMIN)
  @Get('sessions/:id/messages')
  getMessages(@Param('id') id: string) {
    return this.chatService.getMessages(id);
  }

  /** Admin: count of WAITING sessions for sidebar badge */
  @Roles(UserRole.ADMIN)
  @Get('waiting-count')
  getWaitingCount() {
    return this.chatService.getWaitingCount();
  }
}
