import {
  IsString,
  IsNumber,
  IsInt,
  Min,
  IsUUID,
  IsBoolean,
  IsOptional,
} from 'class-validator';

export class FindProductDto {
  @IsOptional()
  @IsNumber()
  page?: number;

  @IsOptional()
  @IsNumber()
  limit?: number;

  @IsOptional()
  @IsString()
  searchWord?: string;

  @IsOptional()
  @IsBoolean()
  inStock?: boolean;

  @IsOptional()
  @IsNumber()
  minPrice?: number;

  @IsOptional()
  @IsNumber()
  maxPrice?: number;

  @IsOptional()
  @IsUUID()
  platformId?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;
}
