import { Module } from '@nestjs/common';
import { HealthController } from './heclth-check.controller';

@Module({
  controllers: [HealthController],
})
export class HealthCheckModule {}
