import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { RedisService } from '../../core/redis/redis.service';
import { ChatStatus } from '@prisma/client';

@Injectable()
export class ChatService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  private queueKey = 'chat:waiting';

  async createSession(customerId: string) {
    const session = await this.prisma.chatSession.create({
      data: {
        customerId,
        status: ChatStatus.WAITING,
      },
    });

    await this.redis
      .getClient()
      .lpush(this.queueKey, session.id);

    return session;
  }

  async assignNext(adminId: string) {
    const redisClient = this.redis.getClient();
    const sessionId = await redisClient.rpop(this.queueKey);

    if (!sessionId) return null;

    const session = await this.prisma.chatSession.update({
      where: { id: sessionId },
      data: {
        adminId,
        status: ChatStatus.ACTIVE,
        startedAt: new Date(),
      },
    });

    return session;
  }

  async saveMessage(
    sessionId: string,
    sender: string,
    message: string,
  ) {
    return this.prisma.chatMessage.create({
      data: {
        sessionId,
        sender,
        message,
      },
    });
  }

  async closeSession(sessionId: string) {
    return this.prisma.chatSession.update({
      where: { id: sessionId },
      data: {
        status: ChatStatus.CLOSED,
        endedAt: new Date(),
      },
    });
  }
}
