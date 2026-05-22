import { IsOptional, IsString } from 'class-validator';

export class CheckoutDto {
  @IsString()
  paymentMethod!: string;

  @IsOptional()
  @IsString()
  promoCode?: string;
}
