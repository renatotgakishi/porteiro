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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { ThemesService } from './themes.service';
import { CreateThemeDto } from './dto/create-theme.dto';
import { UpdateThemeDto } from './dto/update-theme.dto';

@ApiTags('Themes')
@ApiBearerAuth()
@Controller('themes')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class ThemesController {
  constructor(private readonly themesService: ThemesService) {}

  @Post()
  @RequirePermissions('platform.tenants.create')
  create(@Body() dto: CreateThemeDto, @Req() req: any) {
    return this.themesService.create(dto, req.user);
  }

  @Get()
  @RequirePermissions('platform.tenants.read')
  findAll() {
    return this.themesService.findAll();
  }

  @Get(':id')
  @RequirePermissions('platform.tenants.read')
  findOne(@Param('id') id: string) {
    return this.themesService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('platform.tenants.update')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateThemeDto,
    @Req() req: any,
  ) {
    return this.themesService.update(id, dto, req.user);
  }

  @Delete(':id')
  @RequirePermissions('platform.tenants.delete')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.themesService.remove(id, req.user);
  }
}
