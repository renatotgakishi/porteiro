import { ArrayUnique, IsArray, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetPermissionsDto {
  @ApiProperty({
    example: ['perm-id-1', 'perm-id-2'],
    description: 'Lista completa de permissionIds que a role deve ter',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayUnique()
  permissionIds: string[];
}