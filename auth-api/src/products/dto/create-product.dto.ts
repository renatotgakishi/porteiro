import {
  IsString,
  IsNumber,
  IsInt,
  IsOptional,
  IsPositive,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({ example: 'Notebook Dell' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'Notebook para trabalho' })
  @IsString()
  description: string;

  @ApiProperty({ example: 3500.5 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  price: number;

  @ApiProperty({ example: 10 })
  @IsInt()
  @IsPositive()
  stock: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  categoryId: number;
}
