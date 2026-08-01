import { ContentStatus } from "@prisma/client";
import { IsArray, IsDateString, IsEnum, IsOptional, IsString } from "class-validator";

export class UpdatePostDto {
  @IsOptional()
  @IsString()
  title?: string;

  // @IsArray()はValidationPipeのwhitelistがデコレータのないフィールドを削除するのを防ぐための目印です。
  @IsOptional()
  @IsArray()
  content?: unknown;

  @IsOptional()
  @IsString()
  excerpt?: string;

  @IsOptional()
  @IsEnum(ContentStatus)
  status?: ContentStatus;

  // SCHEDULED時にのみ必須(サービス側で検証)。ISO 8601形式の日時文字列。
  @IsOptional()
  @IsDateString()
  publishAt?: string;

  @IsOptional()
  @IsString()
  author?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsArray()
  categoryIds?: string[];
}
