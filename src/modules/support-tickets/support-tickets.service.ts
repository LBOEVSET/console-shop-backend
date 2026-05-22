import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { TicketStatus } from '@prisma/client';

@Injectable()
export class SupportTicketsService {
  constructor(private prisma: PrismaService) {}

  async createTicket(userId: string, title: string, description: string) {
    return this.prisma.supportTicket.create({
      data: {
        userId,
        title,
        description,
        status: TicketStatus.OPEN,
      },
    });
  }

  async replyToTicket(
    ticketId: string,
    sender: string,
    message: string,
  ) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    if (ticket.status === TicketStatus.CLOSED) {
      throw new NotFoundException('Ticket is closed');
    }

    return this.prisma.supportMessage.create({
      data: {
        ticketId,
        sender,
        message,
      },
    });
  }

  async updateStatus(ticketId: string, status: TicketStatus) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    return this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: { status },
    });
  }

  async getMyTickets(userId: string) {
    return this.prisma.supportTicket.findMany({
      where: { userId },
      include: {
        messages: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAllTickets() {
    return this.prisma.supportTicket.findMany({
      include: {
        user: true,
        messages: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
