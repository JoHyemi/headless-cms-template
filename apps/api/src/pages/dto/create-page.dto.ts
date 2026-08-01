import { ContentStatus } from "@prisma/client";
import { IsArray, IsDateString, IsEnum, IsOptional, IsString, MinLength } from "class-validator";

export class CreatePageDto {
  @IsString()
  @MinLength(1)
  title!: string;

  // @IsArray()はValidationPipeのwhitelistがデコレータのないフィールドを削除するのを防ぐための目印です。
  @IsArray()
  content: unknown;

  @IsOptional()
  @IsEnum(ContentStatus)
  status?: ContentStatus;

  // SCHEDULED時にのみ必須(サービス側で検証)。ISO 8601形式の日時文字列。
  @IsOptional()
  @IsDateString()
  publishAt?: string;

  @IsOptional()
  @IsString()
  slug?: string;
}
