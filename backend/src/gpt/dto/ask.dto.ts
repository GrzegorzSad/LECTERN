import { IsInt, IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class AskDto {
  @IsString()
  @IsNotEmpty()
  query: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  groupId: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  channelId: number;
}
