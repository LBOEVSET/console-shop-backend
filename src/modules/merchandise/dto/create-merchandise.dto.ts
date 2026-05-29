import { MerchandiseType } from '@prisma/client';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateMerchandiseMediaDto {
  @IsString()
  type: string;

  @IsString()
  url: string;

  @IsNumber()
  sortOrder: number;
}

export class CreateMerchandiseDto {
  @IsString()
  title: string;

  @IsString()
  slug: string;

  @IsString()
  description: string;

  @IsEnum(MerchandiseType)
  @IsOptional()
  type?: MerchandiseType;

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
  @Type(() => CreateMerchandiseMediaDto)
  media?: CreateMerchandiseMediaDto[];
}
