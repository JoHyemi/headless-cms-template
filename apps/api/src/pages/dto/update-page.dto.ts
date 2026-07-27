import { ContentStatus } from "@prisma/client";
import { IsArray, IsEnum, IsOptional, IsString } from "class-validator";

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

  @IsOptional()
  @IsString()
  slug?: string;
}
