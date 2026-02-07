import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class ListFilesOnedriveDto {
  @ApiPropertyOptional({ description: 'Parent folder ID (optional)' })
  @IsOptional()
  @IsString()
  folderId?: string;

  @ApiPropertyOptional({
    description: 'Filter type: all, files, folders',
    enum: ['all', 'files', 'folders'],
    default: 'all',
  })
  @IsOptional()
  @IsEnum(['all', 'files', 'folders'])
  type?: 'all' | 'files' | 'folders' = 'all';
}