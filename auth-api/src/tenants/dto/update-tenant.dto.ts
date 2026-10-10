import {
  IsDateString,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpdateTenantDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  connectionStringEncrypted?: string;

  @IsOptional()
  @IsDateString()
  licenseExpiresAt?: string;
}