import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PermissionsCacheService } from '../auth/services/permissions-cache.service';
import { AssignRoleDto } from './dto/assign-role.dto';

@Injectable()
export class UserRolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissionsCache: PermissionsCacheService,
  ) {}

  async findByUser(
    userId: string,
    actor: { id: string; tenantId: string | null },
  ) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        ...(actor.tenantId !== null ? { tenantId: actor.tenantId } : {}),
        deleted: false,
      },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    return this.prisma.role.findMany({
      where: {
        deleted: false,
        users: {
          some: {
            userId,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async assign(
    userId: string,
    dto: AssignRoleDto,
    actor: { id: string; tenantId: string | null },
  ) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        ...(actor.tenantId !== null ? { tenantId: actor.tenantId } : {}),
        deleted: false,
      },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const role = await this.prisma.role.findFirst({
      where: {
        id: dto.roleId,
        ...(user.tenantId !== null ? { tenantId: user.tenantId } : {}),
        deleted: false,
      },
    });

    if (!role) {
      throw new NotFoundException('Role não encontrada para este usuário');
    }

    const existing = await this.prisma.userRole.findUnique({
      where: {
        userId_roleId: {
          userId,
          roleId: dto.roleId,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Role já está vinculada a este usuário');
    }

    const userRole = await this.prisma.userRole.create({
      data: {
        userId,
        roleId: dto.roleId,
      },
      include: {
        role: true,
      },
    });

    await this.permissionsCache.invalidateForUser(userId);

    return userRole;
  }

  async remove(
    userId: string,
    roleId: string,
    actor: { id: string; tenantId: string | null },
  ) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        ...(actor.tenantId !== null ? { tenantId: actor.tenantId } : {}),
        deleted: false,
      },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const role = await this.prisma.role.findFirst({
      where: {
        id: roleId,
        ...(user.tenantId !== null ? { tenantId: user.tenantId } : {}),
        deleted: false,
      },
    });

    if (!role) {
      throw new NotFoundException('Role não encontrada');
    }

    const userRole = await this.prisma.userRole.findUnique({
      where: {
        userId_roleId: {
          userId,
          roleId,
        },
      },
    });

    if (!userRole) {
      throw new NotFoundException('Role não está vinculada a este usuário');
    }

    await this.prisma.userRole.delete({
      where: {
        userId_roleId: {
          userId,
          roleId,
        },
      },
    });

    await this.permissionsCache.invalidateForUser(userId);

    return {
      message: 'Role removida do usuário com sucesso',
    };
  }
}
