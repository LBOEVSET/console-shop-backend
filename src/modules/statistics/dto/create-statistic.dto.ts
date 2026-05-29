import { StatEntityType, StatEventType } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateStatisticDto {
  @IsEnum(StatEntityType)
  entityType: StatEntityType;

  @IsString()
  entityId: string;

  @IsEnum(StatEventType)
  eventType: StatEventType;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  guestId?: string;
}
