import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Categories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  create(@Body() createCategoryDto: CreateCategoryDto, @Req() request: any) {
    return this.categoriesService.create(createCategoryDto, request.user);
  }

  @Get()
  findAll(@Req() request: any) {
    return this.categoriesService.findAll(request.user);
  }

  @ApiOkResponse({
    description: 'Categoria encontrada',
  })
  @ApiNotFoundResponse({
    description: 'Categoria não encontrada',
  })
  @Get(':id')
  findOne(@Param('id') id: string, @Req() request: any) {
    return this.categoriesService.findOne(+id, request.user);
  }

  @ApiOkResponse({
    description: 'Categoria atualizada',
  })
  @ApiNotFoundResponse({
    description: 'Categoria não encontrada',
  })
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
    @Req() request: any,
  ) {
    return this.categoriesService.update(+id, updateCategoryDto, request.user);
  }

  @ApiOkResponse({
    description: 'Categoria excluída',
  })
  @ApiNotFoundResponse({
    description: 'Categoria não encontrada',
  })
  @Delete(':id')
  remove(@Param('id') id: string, @Req() request: any) {
    return this.categoriesService.remove(+id, request.user);
  }
}
