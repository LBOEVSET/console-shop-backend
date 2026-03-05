import {
  IsString,
  IsNumber,
  IsInt,
  Min,
  IsUUID,
  IsBoolean,
} from 'class-validator';

export class FindProductDto {
  @IsString()
  searchWord?: string;

  @IsBoolean()
  inStock?: boolean;

  @IsNumber()
  minPrice?: number;

  @IsNumber()
  maxPrice?: number;

  @IsUUID()
  platformId?: string;

  @IsUUID()
  categoryId?: string;
}
