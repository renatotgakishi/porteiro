import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

import { UsersService } from './users.service';

import { CreateUserDto } from './dto/create-user.dto';

import { UpdateUserDto } from './dto/update-user.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() dto: CreateUserDto, @Req() request: any) {
    return this.usersService.create(dto, request.user);
  }

  @Get()
  @ApiQuery({
    name: 'tenantId',
    required: false,
  })
  findAll(@Req() request: any, @Query('tenantId') tenantId?: string) {
    return this.usersService.findAll(request.user, tenantId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() request: any) {
    return this.usersService.findOne(id, request.user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @Req() request: any,
  ) {
    return this.usersService.update(id, dto, request.user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() request: any) {
    return this.usersService.remove(id, request.user);
  }

  @Post(':id/invite')
  invite(@Param('id') id: string, @Req() request: any) {
    return this.usersService.invite(id, request.user);
  }
}
