import { Module } from '@nestjs/common';
import { OmiseService } from './omise.service';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService, OmiseService],
  exports: [OmiseService],
})
export class PaymentsModule {}
