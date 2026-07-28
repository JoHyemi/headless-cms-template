import { IsOptional, IsString } from "class-validator";

export class UpdateMediaDto {
  @IsOptional()
  @IsString()
  alt?: string;

  @IsOptional()
  @IsString()
  caption?: string;
}
