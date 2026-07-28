import { IsArray, IsOptional, IsString } from "class-validator";

export class UpdateBlockTypeDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  // @IsArray()はValidationPipeのwhitelistがデコレータのないフィールドを削除するのを防ぐための目印です。
  @IsOptional()
  @IsArray()
  fields?: unknown;
}
