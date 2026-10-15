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
  ApiBody,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { SetTenantThemeDto } from './dto/set-tenant-theme.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@ApiTags('Tenants')
@ApiBearerAuth()
@Controller('tenants')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Post()
  @RequirePermissions('platform.tenants.create')
  @ApiBody({
    schema: {
      example: {
        name: 'Minha X',
        licenseExpiresAt: '2026-12-31T23:59:59.000Z',
        connectionStringEncrypted: null,
      },
    },
  })
  create(@Body() dto: CreateTenantDto, @Req() request: any) {
    return this.tenantsService.create(dto, request.user);
  }

  @Get()
  @RequirePermissions('platform.tenants.read')
  findAll() {
    return this.tenantsService.findAll();
  }

  @Get(':id')
  @RequirePermissions('platform.tenants.read')
  @ApiOkResponse({ description: 'Tenant encontrado' })
  @ApiNotFoundResponse({ description: 'Tenant não encontrado' })
  findOne(@Param('id') id: string) {
    return this.tenantsService.findOne(id);
  }

  @Get(':id/theme')
  @RequirePermissions('platform.tenants.read')
  getTheme(@Param('id') id: string) {
    return this.tenantsService.findThemeByTenantId(id);
  }

  @Patch(':id/theme')
  @RequirePermissions('platform.tenants.update')
  setTheme(
    @Param('id') id: string,
    @Body() dto: SetTenantThemeDto,
    @Req() req: any,
  ) {
    return this.tenantsService.setTheme(id, dto.themeId ?? null, req.user);
  }

  @Patch(':id')
  @RequirePermissions('platform.tenants.update')
  @ApiOkResponse({ description: 'Tenant atualizado' })
  @ApiNotFoundResponse({ description: 'Tenant não encontrado' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTenantDto,
    @Req() request: any,
  ) {
    return this.tenantsService.update(id, dto, request.user);
  }

  @Delete(':id')
  @RequirePermissions('platform.tenants.delete')
  @ApiOkResponse({ description: 'Tenant excluído' })
  @ApiNotFoundResponse({ description: 'Tenant não encontrado' })
  remove(@Param('id') id: string, @Req() request: any) {
    return this.tenantsService.remove(id, request.user);
  }
}
