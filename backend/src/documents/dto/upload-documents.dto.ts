import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class UploadDocumentDto {
  @ApiProperty({
    description: 'ID of the group the file belongs to',
    example: 1,
  })
  @IsInt()
  @Type(() => Number)
  groupId: number;

  @ApiPropertyOptional({
    description: 'Optional source ID associated with the file',
    example: 2,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  sourceId?: number;

  @ApiPropertyOptional({
    description: 'OneDrive item ID or link to link instead of uploading',
    example: 'ABC123',
  })
  @IsOptional()
  @IsString()
  link?: string;
}
