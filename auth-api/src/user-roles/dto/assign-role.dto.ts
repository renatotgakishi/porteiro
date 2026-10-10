import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignRoleDto {
  @ApiProperty({ example: 'role-uuid-xyz-789' })
  @IsString()
  @IsNotEmpty()
  roleId: string;
}
