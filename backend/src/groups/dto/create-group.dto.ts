import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateGroupDto {
  @ApiProperty({
    description: 'Name of the group',
    maxLength: 100,
    example: 'Engineering Team',
  })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    description: 'Optional image URL for the group',
    example: 'https://example.com/group-image.png',
  })
  @IsOptional()
  @IsString()
  img?: string;
}
