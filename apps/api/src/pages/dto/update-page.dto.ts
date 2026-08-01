import { ContentStatus } from "@prisma/client";
import { IsArray, IsDateString, IsEnum, IsOptional, IsString } from "class-validator";

export class UpdatePageDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsArray()
  content?: unknown;

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
