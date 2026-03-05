import {
  IsString,
  IsNumber,
  IsInt,
  Min,
  IsUUID,
} from 'class-validator';

export class CreateProductDto {
  @IsString()
  title!: string;

  @IsString()
  slug!: string;

  @IsString()
  description!: string;

  @IsNumber()
  price!: number;

  @IsInt()
  @Min(0)
  stock!: number;

  @IsUUID()
  platformId!: string;

  @IsUUID()
  categoryId!: string;
}
