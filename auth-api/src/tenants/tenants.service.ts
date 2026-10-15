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
  constructor(private readonly prisma: PrismaService) {}

  private generateSlug(name: string): string {
    return name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  async create(dto: CreateTenantDto, user: { id: string }) {
    const slug = this.generateSlug(dto.name);
    const existingTenant = await this.prisma.tenant.findUnique({
      where: { slug },
    });
    if (existingTenant)
      throw new ConflictException('Já existe um tenant com esse nome');
    return this.prisma.tenant.create({
      data: {
        name: dto.name,
        slug,
        licenseExpiresAt: new Date(dto.licenseExpiresAt),
        connectionStringEncrypted: dto.connectionStringEncrypted ?? null,
        userId: user.id,
      },
    });
  }

  async findAll() {
    return this.prisma.tenant.findMany({
      where: { deleted: false },
      orderBy: { name: 'asc' },
      include: { theme: true },
    });
  }

  async findOne(id: string) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { id, deleted: false },
      include: { theme: true },
    });
    if (!tenant) throw new NotFoundException('Tenant não encontrado');
    return tenant;
  }

  async findThemeByTenantId(tenantId: string) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { id: tenantId, deleted: false },
      include: { theme: true },
    });
    if (!tenant) throw new NotFoundException('Tenant não encontrado');
    return tenant.theme ?? null;
  }

  async setTheme(
    tenantId: string,
    themeId: string | null,
    actor: { id: string; tenantId: string | null },
  ) {
    // sempre o tenant da URL, que é o da tabela
    const tenant = await this.prisma.tenant.findFirst({
      where: { id: tenantId, deleted: false },
    });
    if (!tenant) throw new NotFoundException('Tenant não encontrado');

    if (themeId) {
      const theme = await this.prisma.theme.findFirst({
        where: { id: themeId, deleted: false },
      });
      if (!theme) throw new NotFoundException(`Tema ${themeId} não encontrado`);
    }

    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        themeId: themeId || null,
        dateAt: new Date(),
      },
      include: { theme: true },
    });
  }

  async update(id: string, dto: UpdateTenantDto, user: { id: string }) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { id, deleted: false },
    });
    if (!tenant) throw new NotFoundException('Tenant não encontrado');
    return this.prisma.tenant.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.connectionStringEncrypted !== undefined && {
          connectionStringEncrypted: dto.connectionStringEncrypted,
        }),
        ...(dto.licenseExpiresAt !== undefined && {
          licenseExpiresAt: new Date(dto.licenseExpiresAt),
        }),
        userId: user.id,
        dateAt: new Date(),
      },
    });
  }

  async remove(id: string, user: { id: string }) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { id, deleted: false },
    });
    if (!tenant) throw new NotFoundException('Tenant não encontrado');
    return this.prisma.tenant.update({
      where: { id },
      data: { deleted: true, userId: user.id, dateAt: new Date() },
    });
  }
}
