import { IsInt, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class AskDto {
  @IsString()
  query: string;

  @IsInt()
  @Type(() => Number)
  channelId: number;
}