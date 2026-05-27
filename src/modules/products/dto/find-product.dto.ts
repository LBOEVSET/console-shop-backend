import {
  IsString,
  IsNumber,
  IsUUID,
  IsBoolean,
  IsOptional,
  IsArray,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

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
  @IsUUID()
  platformId?: string;

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
}
