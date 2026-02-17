import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class AskDto {
  @ApiProperty({ description: 'Query to ask', example: 'Explain recursion.' })
  @IsString()
  query: string;
}