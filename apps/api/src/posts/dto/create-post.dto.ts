import { ContentStatus } from "@prisma/client";
import { IsArray, IsEnum, IsOptional, IsString, MinLength } from "class-validator";

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
