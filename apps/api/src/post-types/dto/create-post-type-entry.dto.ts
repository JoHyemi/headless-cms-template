import { ContentStatus } from "@prisma/client";
import { IsDateString, IsEnum, IsObject, IsOptional, IsString, MinLength } from "class-validator";

export class CreatePostTypeEntryDto {
  @IsString()
  @MinLength(1)
  title!: string;

  @IsOptional()
  @IsString()
  slug?: string;

  // Record<string, FieldValue> — サービス側でisFieldValueMapを使って直接検証します。
  // @IsObject()はValidationPipeのwhitelistがデコレータのないフィールドを削除するのを防ぐための目印です。
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
}
