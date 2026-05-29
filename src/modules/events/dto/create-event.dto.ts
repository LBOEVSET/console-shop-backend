import { ProductKind } from '@prisma/client';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsDateString,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateEventMediaDto {
  @IsString()
  type: string;

  @IsString()
  url: string;

  @IsNumber()
  sortOrder: number;
}

export class CreateEventDto {
  @IsString()
  title: string;

  @IsString()
  slug: string;

  @IsString()
  description: string;

  @IsEnum(ProductKind)
  @IsOptional()
  category?: ProductKind;

  @IsDateString()
  date: string;

  @IsOptional()
  @IsString()
  venue?: string;

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsNumber()
  stock?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @Type(() => CreateEventMediaDto)
  media?: CreateEventMediaDto[];
}
