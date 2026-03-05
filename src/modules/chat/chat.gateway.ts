import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';

@WebSocketGateway({
  namespace: '/chat',
  cors: true,
})
export class ChatGateway {
  @WebSocketServer()
  server!: Server;

  constructor(private chatService: ChatService) {}

  @SubscribeMessage('join')
  async joinRoom(
    @MessageBody() data: { sessionId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(data.sessionId);
  }

  @SubscribeMessage('sendMessage')
  async sendMessage(
    @MessageBody()
    data: {
      sessionId: string;
      sender: string;
      message: string;
    },
  ) {
    const saved = await this.chatService.saveMessage(
      data.sessionId,
      data.sender,
      data.message,
    );

    this.server
      .to(data.sessionId)
      .emit('newMessage', saved);
  }

  @SubscribeMessage('close')
  async close(
    @MessageBody() data: { sessionId: string },
  ) {
    await this.chatService.closeSession(
      data.sessionId,
    );

    this.server
      .to(data.sessionId)
      .emit('closed');
  }
}
