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
import { AssignRoleDto } from './dto/assign-role.dto';
import { UserRolesService } from './user-roles.service';

@Controller('user-roles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class UserRolesController {
  constructor(
    private readonly userRolesService: UserRolesService,
  ) {}

  @Get('user/:userId')
  findByUser(
    @Param('userId') userId: string,
    @Req() request: any,
  ) {
    return this.userRolesService.findByUser(
      userId,
      request.user,
    );
  }

  @Post('user/:userId')
  assign(
    @Param('userId') userId: string,
    @Body() dto: AssignRoleDto,
    @Req() request: any,
  ) {
    return this.userRolesService.assign(
      userId,
      dto,
      request.user,
    );
  }

  @Delete('user/:userId/:roleId')
  remove(
    @Param('userId') userId: string,
    @Param('roleId') roleId: string,
    @Req() request: any,
  ) {
    return this.userRolesService.remove(
      userId,
      roleId,
      request.user,
    );
  }
}