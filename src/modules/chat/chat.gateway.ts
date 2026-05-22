import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ChatService } from './chat.service';

/** Shape stored on each authenticated socket */
interface AuthenticatedSocket extends Socket {
  user?: {
    id: string;
    email: string;
    role: string;
    guestId?: string;
  };
}

@WebSocketGateway({
  namespace: '/chat',
  cors: {
    origin: [
      process.env.WEB_URL || 'https://localhost:3022',
      'http://localhost:3022',
      'https://localhost:3022',
    ],
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(
    private chatService: ChatService,
    private jwtService: JwtService,
  ) {}

  /**
   * Authenticate the socket on connection.
   * Token is expected either in the cookie header (accessToken=<jwt>)
   * or as a handshake auth token: socket.auth = { token: '<jwt>' }
   */
  handleConnection(client: AuthenticatedSocket) {
    try {
      const token = this.extractToken(client);
      if (!token) {
        client.disconnect(true);
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET,
      });

      client.user = {
        id: payload.id,
        email: payload.email,
        role: payload.role,
        guestId: payload.guestId,
      };
    } catch {
      // Invalid / expired token — reject the connection
      client.disconnect(true);
    }
  }

  handleDisconnect(_client: AuthenticatedSocket) {
    // No-op — cleanup handled by application logic
  }

  private extractToken(client: AuthenticatedSocket): string | null {
    // 1. Try socket.io handshake auth object  { auth: { token } }
    const authToken = (client.handshake as any)?.auth?.token;
    if (authToken) return authToken;

    // 2. Try cookie header  "accessToken=<jwt>; ..."
    const cookieHeader: string =
      client.handshake?.headers?.cookie ?? '';
    const match = cookieHeader.match(/(?:^|;\s*)accessToken=([^;]+)/);
    return match ? match[1] : null;
  }

  @SubscribeMessage('join')
  async joinRoom(
    @MessageBody() data: { sessionId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (!client.user) {
      client.disconnect(true);
      return;
    }
    client.join(data.sessionId);
  }

  @SubscribeMessage('sendMessage')
  async sendMessage(
    @MessageBody() data: { sessionId: string; message: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (!client.user) {
      client.disconnect(true);
      return;
    }

    // Use the verified user identity — never trust the client-supplied sender
    const sender = client.user.id || client.user.guestId || 'unknown';

    const saved = await this.chatService.saveMessage(
      data.sessionId,
      sender,
      data.message,
    );

    this.server.to(data.sessionId).emit('newMessage', saved);
  }

  @SubscribeMessage('close')
  async close(
    @MessageBody() data: { sessionId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (!client.user) {
      client.disconnect(true);
      return;
    }

    await this.chatService.closeSession(data.sessionId);
    this.server.to(data.sessionId).emit('closed');
  }
}
