import {
  IsString,
  IsEnum,
  IsBoolean,
  IsOptional,
  IsDateString,
} from 'class-validator';
import { ArticleType } from '@prisma/client';

export class CreateArticleDto {
  @IsEnum(ArticleType)
  type!: ArticleType;

  @IsString()
  title!: string;

  @IsString()
  slug!: string;

  @IsString()
  summary!: string;

  @IsString()
  content!: string;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @IsOptional()
  @IsDateString()
  publishedAt?: string;
}
