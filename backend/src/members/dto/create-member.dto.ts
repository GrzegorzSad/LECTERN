import { IsInt, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateMemberDto {
  @ApiProperty()
  @IsInt()
  groupId: number;

  @ApiProperty()
  @IsInt()
  userId: number;

  @ApiProperty({ example: 'member' })
  @IsString()
  role: string;
}