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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Tenants')
@ApiBearerAuth()
@Controller('tenants')
@UseGuards(JwtAuthGuard)
export class TenantsController {
  constructor(
    private readonly tenantsService: TenantsService,
  ) {}

  @Post()
  @ApiBody({
    schema: {
      example: {
        name: 'Minha X',
        licenseExpiresAt:
          '2026-12-31T23:59:59.000Z',
        connectionStringEncrypted: null,
      },
    },
  })
  create(
    @Body() dto: CreateTenantDto,
    @Req() request: any,
  ) {
    return this.tenantsService.create(
      dto,
      request.user,
    );
  }

  @Get()
  findAll() {
    return this.tenantsService.findAll();
  }

  @ApiOkResponse({
    description: 'Tenant encontrado',
  })
  @ApiNotFoundResponse({
    description: 'Tenant não encontrado',
  })
  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.tenantsService.findOne(id);
  }

  @ApiOkResponse({
    description: 'Tenant atualizado',
  })
  @ApiNotFoundResponse({
    description: 'Tenant não encontrado',
  })
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTenantDto,
    @Req() request: any,
  ) {
    return this.tenantsService.update(
      id,
      dto,
      request.user,
    );
  }

  @ApiOkResponse({
    description: 'Tenant excluído',
  })
  @ApiNotFoundResponse({
    description: 'Tenant não encontrado',
  })
  @Delete(':id')
  remove(
    @Param('id') id: string,
    @Req() request: any,
  ) {
    return this.tenantsService.remove(
      id,
      request.user,
    );
  }
}