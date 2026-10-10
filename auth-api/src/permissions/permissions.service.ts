import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PermissionsCacheService } from '../auth/services/permissions-cache.service';
import { AssignPermissionDto } from './dto/assign-permission.dto';

@Injectable()
export class PermissionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissionsCache: PermissionsCacheService,
  ) {}

  async findAll() {
    return this.prisma.permission.findMany({
      where: {
        deleted: false,
      },
      orderBy: {
        key: 'asc',
      },
    });
  }

  async findByRole(
    roleId: string,
    actor: { id: string; tenantId: string | null },
  ) {
    const role = await this.prisma.role.findFirst({
      where: {
        id: roleId,
        ...(actor.tenantId !== null ? { tenantId: actor.tenantId } : {}),
        deleted: false,
      },
    });

    if (!role) {
      throw new NotFoundException('Role não encontrada');
    }

    return this.prisma.permission.findMany({
      where: {
        deleted: false,
        roles: {
          some: {
            roleId,
          },
        },
      },
      orderBy: {
        key: 'asc',
      },
    });
  }

  async assign(
    roleId: string,
    dto: AssignPermissionDto,
    actor: { id: string; tenantId: string | null },
  ) {
    const role = await this.prisma.role.findFirst({
      where: {
        id: roleId,
        ...(actor.tenantId !== null ? { tenantId: actor.tenantId } : {}),
        deleted: false,
      },
    });

    if (!role) {
      throw new NotFoundException('Role não encontrada');
    }

    const permission = await this.prisma.permission.findFirst({
      where: {
        id: dto.permissionId,
        deleted: false,
      },
    });

    if (!permission) {
      throw new NotFoundException('Permissão não encontrada');
    }

    const existing = await this.prisma.rolePermission.findUnique({
      where: {
        roleId_permissionId: {
          roleId,
          permissionId: dto.permissionId,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Permissão já está vinculada a esta role');
    }

    const rolePermission = await this.prisma.rolePermission.create({
      data: {
        roleId,
        permissionId: dto.permissionId,
      },
      include: {
        permission: true,
      },
    });

    await this.permissionsCache.invalidateForRole(roleId);

    return rolePermission;
  }

  async remove(
    roleId: string,
    permissionId: string,
    actor: { id: string; tenantId: string | null },
  ) {
    const role = await this.prisma.role.findFirst({
      where: {
        id: roleId,
        ...(actor.tenantId !== null ? { tenantId: actor.tenantId } : {}),
        deleted: false,
      },
    });

    if (!role) {
      throw new NotFoundException('Role não encontrada');
    }

    const permission = await this.prisma.permission.findFirst({
      where: {
        id: permissionId,
        deleted: false,
      },
    });

    if (!permission) {
      throw new NotFoundException('Permissão não encontrada');
    }

    const rolePermission = await this.prisma.rolePermission.findUnique({
      where: {
        roleId_permissionId: {
          roleId,
          permissionId,
        },
      },
    });

    if (!rolePermission) {
      throw new NotFoundException('Permissão não está vinculada a esta role');
    }

    await this.prisma.rolePermission.delete({
      where: {
        roleId_permissionId: {
          roleId,
          permissionId,
        },
      },
    });

    await this.permissionsCache.invalidateForRole(roleId);

    return {
      message: 'Permissão removida da role com sucesso',
    };
  }
}
