import { IsString, IsInt, Min, IsOptional } from 'class-validator';

export class EventCheckoutDto {
  @IsString()
  eventId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsString()
  paymentMethod!: string;

  @IsOptional()
  @IsString()
  promoCode?: string;
}
