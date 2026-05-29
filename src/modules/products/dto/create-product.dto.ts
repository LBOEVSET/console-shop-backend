import {
  IsString,
  IsNumber,
  IsInt,
  Min,
  IsUUID,
  IsEnum,
  IsOptional,
} from 'class-validator';
import { ProductKind } from '@prisma/client';

export class CreateProductDto {
  @IsString()
  title!: string;

  @IsString()
  slug!: string;

  @IsString()
  description!: string;

  @IsNumber()
  price!: number;

  @IsNumber()
  salePrice!: number;

  @IsInt()
  @Min(0)
  stock!: number;

  @IsUUID()
  platformId!: string;

  @IsUUID()
  categoryId!: string;

  @IsOptional()
  @IsEnum(ProductKind)
  category?: ProductKind;

  @IsOptional()
  @IsString()
  type?: string;
}
