import { Module } from '@nestjs/common';
import { SupportTicketsService } from './support-tickets.service';
import { SupportTicketsController } from './support-tickets.controller';

@Module({
  providers: [SupportTicketsService],
  controllers: [SupportTicketsController],
})
export class SupportTicketsModule {}
