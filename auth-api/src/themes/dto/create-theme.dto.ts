import {
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateThemeDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  slug?: string;

  @IsEnum(['flat', 'glass', 'neumorphism'])
  @IsOptional()
  style?: string = 'flat';

  @IsEnum(['compact', 'comfortable'])
  @IsOptional()
  density?: string = 'comfortable';

  @IsEnum(['draft', 'published'])
  @IsOptional()
  status?: string = 'draft';

  @IsObject()
  colorsLight: any;

  @IsObject()
  colorsDark: any;

  @IsObject()
  backgroundLight: any;

  @IsObject()
  backgroundDark: any;

  @IsObject()
  @IsOptional()
  glassConfig?: any;

  @IsObject()
  @IsOptional()
  neumorphConfig?: any;

  @IsObject()
  @IsOptional()
  shadows?: any;

  @IsObject()
  @IsOptional()
  radius?: any;

  @IsObject()
  @IsOptional()
  typography?: any;
}
