import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class LinkDocumentDto {
  @ApiProperty({
    description: 'ID of the group the file belongs to',
    example: 1,
  })
  @IsInt()
  @Type(() => Number)
  groupId: number;

  @ApiProperty({
    description: 'link',
    example: 'windowWhen.com',
  })
  @IsString()
  link: string;

  @ApiPropertyOptional({
    description: 'Optional source ID associated with the file',
    example: 2,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  sourceId?: number;
}
