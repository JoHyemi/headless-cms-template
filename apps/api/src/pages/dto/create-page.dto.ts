import { ContentStatus } from "@prisma/client";
import { IsArray, IsEnum, IsOptional, IsString, MinLength } from "class-validator";

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

  @IsOptional()
  @IsString()
  slug?: string;
}
