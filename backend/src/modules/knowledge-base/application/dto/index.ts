import { IsArray, IsBoolean, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateCategoryDto {
  @IsNotEmpty() @IsString() @MaxLength(255) name: string;
  @IsNotEmpty() @IsString() @MaxLength(255) slug: string;
  @IsOptional() @IsString() @MaxLength(1000) description?: string;
}

export class CreateArticleDto {
  @IsNotEmpty() @IsString() @MaxLength(500) title: string;
  @IsNotEmpty() @IsString() @MaxLength(500) slug: string;
  @IsNotEmpty() @IsString() body: string;
  @IsOptional() @IsUUID() categoryId?: string;
  @IsOptional() @IsBoolean() isPublished?: boolean;
  @IsOptional() @IsBoolean() isInternal?: boolean;
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
}

export class UpdateArticleDto {
  @IsOptional() @IsString() @MaxLength(500) title?: string;
  @IsOptional() @IsString() @MaxLength(500) slug?: string;
  @IsOptional() @IsString() body?: string;
  @IsOptional() @IsUUID() categoryId?: string | null;
  @IsOptional() @IsBoolean() isPublished?: boolean;
  @IsOptional() @IsBoolean() isInternal?: boolean;
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
}
