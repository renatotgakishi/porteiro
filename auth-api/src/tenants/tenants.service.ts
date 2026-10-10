import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';

@Injectable()
export class TenantsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  private generateSlug(name: string): string {
    return name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  async create(
    dto: CreateTenantDto,
    user: { id: string },
  ) {
    const slug = this.generateSlug(dto.name);

    const existingTenant =
      await this.prisma.tenant.findUnique({
        where: {
          slug,
        },
      });

    if (existingTenant) {
      throw new ConflictException(
        'Já existe um tenant com esse nome',
      );
    }

    return this.prisma.tenant.create({
      data: {
        name: dto.name,
        slug,
        licenseExpiresAt:
          new Date(dto.licenseExpiresAt),
        connectionStringEncrypted:
          dto.connectionStringEncrypted ?? null,
        userId: user.id,
      },
    });
  }

  async findAll() {
    return this.prisma.tenant.findMany({
      where: {
        deleted: false,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async findOne(id: string) {
    const tenant =
      await this.prisma.tenant.findFirst({
        where: {
          id,
          deleted: false,
        },
      });

    if (!tenant) {
      throw new NotFoundException(
        'Tenant não encontrado',
      );
    }

    return tenant;
  }

  async update(
    id: string,
    dto: UpdateTenantDto,
    user: { id: string },
  ) {
    const tenant =
      await this.prisma.tenant.findFirst({
        where: {
          id,
          deleted: false,
        },
      });

    if (!tenant) {
      throw new NotFoundException(
        'Tenant não encontrado',
      );
    }

    return this.prisma.tenant.update({
      where: {
        id,
      },
      data: {
        ...(dto.name !== undefined && {
          name: dto.name,
        }),

        ...(dto.connectionStringEncrypted !==
          undefined && {
          connectionStringEncrypted:
            dto.connectionStringEncrypted,
        }),

        ...(dto.licenseExpiresAt !==
          undefined && {
          licenseExpiresAt:
            new Date(dto.licenseExpiresAt),
        }),

        userId: user.id,
        dateAt: new Date(),
      },
    });
  }

  async remove(
    id: string,
    user: { id: string },
  ) {
    const tenant =
      await this.prisma.tenant.findFirst({
        where: {
          id,
          deleted: false,
        },
      });

    if (!tenant) {
      throw new NotFoundException(
        'Tenant não encontrado',
      );
    }

    return this.prisma.tenant.update({
      where: {
        id,
      },
      data: {
        deleted: true,
        userId: user.id,
        dateAt: new Date(),
      },
    });
  }
}