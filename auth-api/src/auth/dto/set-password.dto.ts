import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetPasswordDto {
  @ApiProperty({ description: 'Token recebido por email' })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({ example: 'novaSenha123', minLength: 6 })
  @IsString()
  @MinLength(6)
  newPassword: string;
}