import { ContentStatus } from "@prisma/client";
import { IsArray, IsEnum, IsOptional, IsString } from "class-validator";

export class UpdatePostDto {
  @IsOptional()
  @IsString()
  title?: string;

  // @IsArray()는 ValidationPipe의 whitelist가 데코레이터 없는 필드를 제거하는 것을 막기 위한 표시입니다.
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
