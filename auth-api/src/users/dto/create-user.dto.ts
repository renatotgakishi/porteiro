import {
  IsArray,
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'João Silva', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: 'joao.silva@email.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'senha123456' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({
    example: 'tenant-uuid-abc-123',
    required: false,
  })
  @IsOptional()
  @IsString()
  tenantId?: string;

  @ApiProperty({
    example: ['role-uuid-1', 'role-uuid-2'],
    required: false,
    type: [String],
    description: 'IDs das roles a associar ao usuário',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roleIds?: string[];
}