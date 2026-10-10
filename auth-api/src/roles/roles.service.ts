import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { PermissionsCacheService } from '../auth/services/permissions-cache.service';

import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { SetPermissionsDto } from './dto/set-permissions.dto';

@Injectable()
export class RolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissionsCache: PermissionsCacheService,
  ) {}

  async create(
    dto: CreateRoleDto,
    actor: {
      id: string;
      tenantId: string | null;
    },
  ) {
    let tenantId = actor.tenantId;

    if (actor.tenantId !== null) {
      if (dto.tenantId && dto.tenantId !== actor.tenantId) {
        throw new ForbiddenException(
          'Não é permitido criar role em outro tenant',
        );
      }

      tenantId = actor.tenantId;
    } else {
      tenantId = dto.tenantId ?? null;
    }

    if (tenantId) {
      const tenant = await this.prisma.tenant.findFirst({
        where: {
          id: tenantId,
          deleted: false,
        },
      });

      if (!tenant) {
        throw new NotFoundException('Tenant não encontrado');
      }
    }

    const existingRole = await this.prisma.role.findFirst({
      where: {
        name: dto.name,
        tenantId,
        deleted: false,
      },
    });

    if (existingRole) {
      throw new ConflictException('Role já existe neste tenant');
    }

    return this.prisma.role.create({
      data: {
        name: dto.name,
        description: dto.description ?? null,
        tenantId,
        userId: actor.id,
      },
      include: {
        _count: {
          select: {
            users: true,
            permissions: true,
          },
        },
      },
    });
  }

  async findAll(
    actor: {
      id: string;
      tenantId: string | null;
    },
    tenantId?: string,
  ) {
    const where =
      actor.tenantId !== null
        ? {
            tenantId: actor.tenantId,
            deleted: false,
          }
        : {
            ...(tenantId ? { tenantId } : {}),
            deleted: false,
          };

    return this.prisma.role.findMany({
      where,
      orderBy: {
        name: 'asc',
      },
      include: {
        _count: {
          select: {
            users: true,
            permissions: true,
          },
        },
      },
    });
  }

  async findOne(
    id: string,
    actor: {
      id: string;
      tenantId: string | null;
    },
  ) {
    const role = await this.prisma.role.findFirst({
      where: {
        id,
        ...(actor.tenantId !== null ? { tenantId: actor.tenantId } : {}),
        deleted: false,
      },
      include: {
        _count: {
          select: {
            users: true,
            permissions: true,
          },
        },
      },
    });

    if (!role) {
      throw new NotFoundException('Role não encontrada');
    }

    return role;
  }

  async update(
    id: string,
    dto: UpdateRoleDto,
    actor: {
      id: string;
      tenantId: string | null;
    },
  ) {
    const existingRole = await this.prisma.role.findFirst({
      where: {
        id,
        ...(actor.tenantId !== null ? { tenantId: actor.tenantId } : {}),
        deleted: false,
      },
    });

    if (!existingRole) {
      throw new NotFoundException('Role não encontrada');
    }

    let tenantId = existingRole.tenantId;

    if (actor.tenantId !== null) {
      if (dto.tenantId && dto.tenantId !== actor.tenantId) {
        throw new ForbiddenException(
          'Não é permitido mover role para outro tenant',
        );
      }

      tenantId = actor.tenantId;
    } else if (dto.tenantId !== undefined) {
      tenantId = dto.tenantId;
    }

    if (tenantId) {
      const tenant = await this.prisma.tenant.findFirst({
        where: {
          id: tenantId,
          deleted: false,
        },
      });

      if (!tenant) {
        throw new NotFoundException('Tenant não encontrado');
      }
    }

    if (dto.name !== undefined) {
      const duplicate = await this.prisma.role.findFirst({
        where: {
          name: dto.name,
          tenantId,
          deleted: false,
          NOT: {
            id,
          },
        },
      });

      if (duplicate) {
        throw new ConflictException('Role já existe neste tenant');
      }
    }

    const tenantChanged = tenantId !== existingRole.tenantId;

    const updatedRole = await this.prisma.role.update({
      where: {
        id,
      },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description }
          : {}),
        ...(tenantChanged ? { tenantId } : {}),
        userId: actor.id,
        dateAt: new Date(),
      },
      include: {
        _count: {
          select: {
            users: true,
            permissions: true,
          },
        },
      },
    });

    if (tenantChanged) {
      await this.permissionsCache.invalidateForRole(id);
    }

    return updatedRole;
  }

  async remove(
    id: string,
    actor: {
      id: string;
      tenantId: string | null;
    },
  ) {
    const existingRole = await this.prisma.role.findFirst({
      where: {
        id,
        ...(actor.tenantId !== null ? { tenantId: actor.tenantId } : {}),
        deleted: false,
      },
    });

    if (!existingRole) {
      throw new NotFoundException('Role não encontrada');
    }

    const removedRole = await this.prisma.role.update({
      where: {
        id,
      },
      data: {
        deleted: true,
        userId: actor.id,
        dateAt: new Date(),
      },
    });

    await this.permissionsCache.invalidateForRole(id);

    return removedRole;
  }

  async setPermissions(
    id: string,
    dto: SetPermissionsDto,
    actor: {
      id: string;
      tenantId: string | null;
    },
  ) {
    // Valida que a role existe e é do tenant do ator (ou ator é plataforma).
    const role = await this.prisma.role.findFirst({
      where: {
        id,
        ...(actor.tenantId !== null ? { tenantId: actor.tenantId } : {}),
        deleted: false,
      },
    });

    if (!role) {
      throw new NotFoundException('Role não encontrada');
    }

    // Valida que todas as permissions existem e não estão deletadas.
    if (dto.permissionIds.length > 0) {
      const foundPermissions = await this.prisma.permission.findMany({
        where: {
          id: { in: dto.permissionIds },
          deleted: false,
        },
        select: { id: true },
      });

      if (foundPermissions.length !== dto.permissionIds.length) {
        throw new NotFoundException(
          'Uma ou mais permissões não foram encontradas',
        );
      }
    }

    // Estado atual
    const current = await this.prisma.rolePermission.findMany({
      where: { roleId: id },
      select: { permissionId: true },
    });
    const currentIds = new Set(current.map((rp) => rp.permissionId));
    const newIds = new Set(dto.permissionIds);

    const toAdd = [...newIds].filter((pid) => !currentIds.has(pid));
    const toRemove = [...currentIds].filter((pid) => !newIds.has(pid));

    // Transação: adiciona, remove, atualiza auditoria.
    await this.prisma.$transaction([
      ...toRemove.map((permissionId) =>
        this.prisma.rolePermission.delete({
          where: {
            roleId_permissionId: { roleId: id, permissionId },
          },
        }),
      ),
      ...toAdd.map((permissionId) =>
        this.prisma.rolePermission.create({
          data: { roleId: id, permissionId },
        }),
      ),
      this.prisma.role.update({
        where: { id },
        data: { userId: actor.id, dateAt: new Date() },
      }),
    ]);

    // Invalida cache de todos os usuários com essa role.
    await this.permissionsCache.invalidateForRole(id);

    return {
      added: toAdd.length,
      removed: toRemove.length,
      total: newIds.size,
    };
  }
}
