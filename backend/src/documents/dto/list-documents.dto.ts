import { IsOptional, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class ListDocumentsDto {
  @ApiPropertyOptional({
    description: 'groupId',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  groupId?: number;

  @ApiPropertyOptional({
    description: 'userId',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  userId?: number;
}
