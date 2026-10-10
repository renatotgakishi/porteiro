import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { SetPermissionsDto } from './dto/set-permissions.dto';

import { RolesService } from './roles.service';

@Controller('roles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  create(@Body() dto: CreateRoleDto, @Req() request: any) {
    return this.rolesService.create(dto, request.user);
  }

  @Get()
  @ApiQuery({
    name: 'tenantId',
    required: false,
  })
  findAll(@Req() request: any, @Query('tenantId') tenantId?: string) {
    return this.rolesService.findAll(request.user, tenantId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() request: any) {
    return this.rolesService.findOne(id, request.user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
    @Req() request: any,
  ) {
    return this.rolesService.update(id, dto, request.user);
  }

  @Put(':id/permissions')
  setPermissions(
    @Param('id') id: string,
    @Body() dto: SetPermissionsDto,
    @Req() request: any,
  ) {
    return this.rolesService.setPermissions(id, dto, request.user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() request: any) {
    return this.rolesService.remove(id, request.user);
  }
}