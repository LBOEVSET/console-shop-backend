import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsArray,
  IsUUID,
  IsEnum,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ProductKind } from '@prisma/client';

export class FindProductDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;

  @IsOptional()
  @IsString()
  searchWord?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  inStock?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxPrice?: number;

  @IsOptional()
  @IsString()
  platform?: string;   // filter by platform name (e.g. "Nintendo Switch") — better for SEO URLs

  // Multi-select genres: ?categoryIds=uuid1&categoryIds=uuid2
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined ? undefined
    : Array.isArray(value) ? value
    : [value],
  )
  @IsArray()
  @IsUUID('all', { each: true })
  categoryIds?: string[];

  @IsOptional()
  @IsEnum(ProductKind)
  category?: ProductKind;

  @IsOptional()
  @IsString()
  type?: string;
}
