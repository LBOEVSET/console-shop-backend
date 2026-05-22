import {
  Controller,
  Post,
  Req,
} from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { ChatService } from './chat.service';

@Controller({
  path: 'chat',
  version: '1',
})
export class ChatController {
  constructor(private chatService: ChatService) {}

  // Customer creates session
  @Roles(UserRole.CUSTOMER)
  @Post('start')
  start(@Req() req: any) {
    return this.chatService.createSession(
      req.user.id,
    );
  }

  // Admin assigns next
  @Roles(UserRole.ADMIN)
  @Post('assign')
  assign(@Req() req: any) {
    return this.chatService.assignNext(
      req.user.id,
    );
  }
}
