import { ContentStatus } from "@prisma/client";
import { IsArray, IsEnum, IsOptional, IsString, MinLength } from "class-validator";

export class CreatePageDto {
  @IsString()
  @MinLength(1)
  title!: string;

  // @IsArray()는 ValidationPipe의 whitelist가 데코레이터 없는 필드를 제거하는 것을 막기 위한 표시입니다.
  @IsArray()
  content: unknown;

  @IsOptional()
  @IsEnum(ContentStatus)
  status?: ContentStatus;

  @IsOptional()
  @IsString()
  slug?: string;
}
