import {
  IsString,
  IsNumber,
  IsInt,
  IsOptional,
  IsPositive,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateProductDto {
  @ApiProperty({ example: 'Notebook Dell', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: 'Notebook atualizado', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 3200.0, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  price?: number;

  @ApiProperty({ example: 5, required: false })
  @IsOptional()
  @IsInt()
  stock?: number;

  @ApiProperty({ example: 2, required: false })
  @IsOptional()
  @IsInt()
  categoryId?: number;
}
