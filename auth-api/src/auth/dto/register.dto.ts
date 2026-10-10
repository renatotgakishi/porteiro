import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'João Silva' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'joao.silva@email.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'senha123456' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'tenant-uuid-abc-123' })
  @IsString()
  @IsNotEmpty()
  tenantId: string;
}