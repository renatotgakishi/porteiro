import { IsOptional, IsString } from 'class-validator';

export class SetTenantThemeDto {
  @IsString()
  @IsOptional()
  themeId?: string | null;
}