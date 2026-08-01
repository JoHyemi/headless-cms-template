import { ContentStatus } from "@prisma/client";
import { IsArray, IsDateString, IsEnum, IsOptional, IsString, MinLength } from "class-validator";

export class CreatePostDto {
  @IsString()
  @MinLength(1)
  title!: string;

  // Block[] — クラスバリデータでは扱いにくいユニオン型なので、サービス側でisBlockArrayを使って直接検証します。
  // @IsArray()は形の検証のためではなく、ValidationPipeのwhitelistがデコレータのないフィールドを
  // 削除してしまうのを防ぐための最小限の目印です。
  @IsArray()
  content: unknown;

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
