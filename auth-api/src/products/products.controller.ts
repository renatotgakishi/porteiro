import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@ApiTags('Products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @RequirePermissions('catalog.products.create')
  create(@Body() dto: CreateProductDto, @Req() request: any) {
    return this.productsService.create(dto, request.user);
  }

  @Get()
  @RequirePermissions('catalog.products.read')
  findAll(@Req() request: any) {
    return this.productsService.findAll(request.user);
  }

  @Get('by-category')
  @RequirePermissions('catalog.products.read')
  findByCategory(
    @Req() request: any,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: number,
  ) {
    return this.productsService.findByCategory(
      +page,
      +limit,
      search,
      categoryId ? +categoryId : undefined,
      request.user,
    );
  }

  @Get(':id')
  @RequirePermissions('catalog.products.read')
  findOne(@Param('id') id: string, @Req() request: any) {
    return this.productsService.findOne(+id, request.user);
  }

  @Put(':id')
  @RequirePermissions('catalog.products.update')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @Req() request: any,
  ) {
    return this.productsService.update(+id, dto, request.user);
  }

  @Delete(':id')
  @RequirePermissions('catalog.products.delete')
  remove(@Param('id') id: string, @Req() request: any) {
    return this.productsService.remove(+id, request.user);
  }
}
