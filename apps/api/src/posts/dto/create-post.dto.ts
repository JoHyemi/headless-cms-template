import { ContentStatus } from "@prisma/client";
import { IsArray, IsEnum, IsOptional, IsString, MinLength } from "class-validator";

export class CreatePostDto {
  @IsString()
  @MinLength(1)
  title!: string;

  // Block[] — 클래스 검증기가 다루기 어려운 유니온 타입이라 서비스에서 isBlockArray로 직접 검증합니다.
  // @IsArray()는 형태 검증용이 아니라, ValidationPipe의 whitelist가 데코레이터 없는 필드를
  // 제거해버리는 것을 막기 위한 최소 표시입니다.
  @IsArray()
  content: unknown;

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
