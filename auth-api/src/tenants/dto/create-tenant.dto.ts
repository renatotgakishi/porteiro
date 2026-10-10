import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTenantDto {
  @ApiProperty({ example: 'Empresa XPTO' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'encrypted_connection_string_hash', required: false })
  @IsOptional()
  @IsString()
  connectionStringEncrypted?: string;

  @ApiProperty({ example: '2027-12-31T23:59:59.999Z' })
  @IsDateString()
  licenseExpiresAt: string;
}
