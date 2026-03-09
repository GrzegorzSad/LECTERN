import { IsString, IsNotEmpty, IsInt, IsOptional, IsBoolean } from 'class-validator';

export class CreateMessageDto {
  @IsString()
  @IsNotEmpty()
  content: string;

  @IsInt()
  @IsOptional()
  parentMessageId?: number;

  @IsBoolean()
  @IsOptional()
  noAi?: boolean;
}