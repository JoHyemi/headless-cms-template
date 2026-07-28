import { ContentStatus } from "@prisma/client";
import { IsArray, IsEnum, IsOptional, IsString } from "class-validator";

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
