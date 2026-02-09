import { IsArray, IsInt, IsOptional, IsString } from 'class-validator';

export class CreateChunksDto {
  @IsInt()
  fileId: number;

  @IsArray()
  vectors: number[][];

  @IsArray()
  @IsOptional()
  chunks?: string[];

  @IsArray()
  @IsOptional()
  fileNames?: string[];

  @IsArray()
  @IsOptional()
  relations?: string[];

  @IsArray()
  @IsOptional()
  entities?: string[];
}
