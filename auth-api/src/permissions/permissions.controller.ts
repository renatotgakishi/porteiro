import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AssignPermissionDto } from './dto/assign-permission.dto';
import { PermissionsService } from './permissions.service';

@Controller('permissions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get()
  findAll() {
    return this.permissionsService.findAll();
  }

  @Get('role/:roleId')
  findByRole(@Param('roleId') roleId: string, @Req() request: any) {
    return this.permissionsService.findByRole(roleId, request.user);
  }

  @Post('role/:roleId')
  assign(
    @Param('roleId') roleId: string,
    @Body() dto: AssignPermissionDto,
    @Req() request: any,
  ) {
    return this.permissionsService.assign(roleId, dto, request.user);
  }

  @Delete('role/:roleId/:permissionId')
  remove(
    @Param('roleId') roleId: string,
    @Param('permissionId') permissionId: string,
    @Req() request: any,
  ) {
    return this.permissionsService.remove(roleId, permissionId, request.user);
  }
}
