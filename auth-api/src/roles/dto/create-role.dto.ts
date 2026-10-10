import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRoleDto {
  @ApiProperty({ example: 'Admin' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: 'Administrador do tenant',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example: 'tenant-uuid-abc-123',
    required: false,
  })
  @IsOptional()
  @IsString()
  tenantId?: string;
}