import { IsArray, IsOptional, IsString, MinLength } from "class-validator";

export class CreatePostTypeDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  slug?: string;

  // FieldDef[] — クラスバリデータでは扱いにくいので、サービス側でisFieldDefArrayを使って直接検証します。
  // @IsArray()はValidationPipeのwhitelistがデコレータのないフィールドを削除するのを防ぐための目印です。
  @IsArray()
  fields: unknown;
}
