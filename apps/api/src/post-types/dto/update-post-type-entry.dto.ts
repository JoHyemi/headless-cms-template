import { ContentStatus } from "@prisma/client";
import { IsArray, IsDateString, IsEnum, IsObject, IsOptional, IsString } from "class-validator";

export class UpdatePostTypeEntryDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsObject()
  fieldValues?: unknown;

  @IsOptional()
  @IsEnum(ContentStatus)
  status?: ContentStatus;

  // SCHEDULED時にのみ必須(サービス側で検証)。ISO 8601形式の日時文字列。
  @IsOptional()
  @IsDateString()
  publishAt?: string;

  @IsOptional()
  @IsArray()
  categoryIds?: string[];
}
