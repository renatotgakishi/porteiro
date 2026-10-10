import { VerificationTokenService } from '../auth/services/verification-token.service';
import { MailService } from '../mail/mail.service';

import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import * as bcrypt from 'bcrypt';

import { PrismaService } from '../prisma/prisma.service';
import { PermissionsCacheService } from '../auth/services/permissions-cache.service';

import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissionsCache: PermissionsCacheService,
    private readonly verificationTokens: VerificationTokenService,
    private readonly mailService: MailService,
  ) {}

  /**
   * Regra de negócio: email é único GLOBALMENTE, mesmo que o schema
   * só force @@unique([tenantId, email]).
   *
   * Motivo: o login busca por email sem filtrar tenant. Se existissem
   * dois users com o mesmo email em tenants diferentes, o login ficaria
   * ambíguo (e cai no InternalServerErrorException do auth.service).
   *
   * @param email         email a validar
   * @param ignoreUserId  ignorar este user (usado no update)
   */
  private async assertEmailGloballyUnique(
    email: string,
    ignoreUserId?: string,
  ): Promise<void> {
    const existing = await this.prisma.user.findFirst({
      where: {
        email,
        deleted: false,
        ...(ignoreUserId ? { id: { not: ignoreUserId } } : {}),
      },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException('E-mail já cadastrado');
    }
  }

  async create(
    createUserDto: CreateUserDto,
    actor: {
      id: string;
      tenantId: string | null;
    },
  ) {
    const {
      email,
      password,
      name,
      tenantId: requestedTenantId,
      roleIds,
    } = createUserDto;

    let tenantId = actor.tenantId;

    if (actor.tenantId !== null) {
      if (requestedTenantId && requestedTenantId !== actor.tenantId) {
        throw new ForbiddenException(
          'Não é permitido criar usuário em outro tenant',
        );
      }

      tenantId = actor.tenantId;
    } else {
      tenantId = requestedTenantId ?? null;
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

    // Regra global: email único em qualquer tenant
    await this.assertEmailGloballyUnique(email);

    // Valida as roles (se vieram)
    if (roleIds && roleIds.length > 0) {
      const found = await this.prisma.role.findMany({
        where: {
          id: { in: roleIds },
          ...(tenantId ? { tenantId } : {}),
          deleted: false,
        },
        select: { id: true },
      });

      if (found.length !== roleIds.length) {
        throw new NotFoundException(
          'Uma ou mais roles não foram encontradas neste tenant',
        );
      }
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email,
          name,
          password: passwordHash,
          tenantId,
          userId: actor.id,
        },
      });

      if (roleIds && roleIds.length > 0) {
        await tx.userRole.createMany({
          data: roleIds.map((roleId) => ({
            userId: created.id,
            roleId,
          })),
          skipDuplicates: true,
        });
      }

      return created;
    });

    await this.permissionsCache.invalidateForUser(user.id);

    const { password: _, ...result } = user;
    return result;
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

    const users = await this.prisma.user.findMany({
      where,
      select: {
        id: true,
        tenantId: true,
        name: true,
        email: true,
        emailVerified: true,
        image: true,
        lastLoginAt: true,
        dateAt: true,
        userId: true,
        roles: {
          select: {
            role: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    return users.map((u) => ({
      id: u.id,
      tenantId: u.tenantId,
      name: u.name,
      email: u.email,
      emailVerified: u.emailVerified,
      image: u.image,
      lastLoginAt: u.lastLoginAt,
      dateAt: u.dateAt,
      userId: u.userId,
      roles: u.roles.map((ur) => ur.role),
    }));
  }

  async findOne(
    id: string,
    actor: {
      id: string;
      tenantId: string | null;
    },
  ) {
    const user = await this.prisma.user.findFirst({
      where: {
        id,
        ...(actor.tenantId !== null ? { tenantId: actor.tenantId } : {}),
        deleted: false,
      },
      select: {
        id: true,
        tenantId: true,
        name: true,
        email: true,
        emailVerified: true,
        image: true,
        lastLoginAt: true,
        dateAt: true,
        userId: true,
        roles: {
          select: {
            role: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    return {
      id: user.id,
      tenantId: user.tenantId,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      image: user.image,
      lastLoginAt: user.lastLoginAt,
      dateAt: user.dateAt,
      userId: user.userId,
      roles: user.roles.map((ur) => ur.role),
    };
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
    actor: {
      id: string;
      tenantId: string | null;
    },
  ) {
    const existingUser = await this.prisma.user.findFirst({
      where: {
        id,
        ...(actor.tenantId !== null ? { tenantId: actor.tenantId } : {}),
        deleted: false,
      },
    });

    if (!existingUser) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const {
      email,
      password,
      name,
      tenantId: requestedTenantId,
      roleIds,
    } = updateUserDto;

    let tenantId = existingUser.tenantId;

    if (actor.tenantId !== null) {
      if (requestedTenantId && requestedTenantId !== actor.tenantId) {
        throw new ForbiddenException(
          'Não é permitido mover usuário para outro tenant',
        );
      }

      tenantId = actor.tenantId;
    } else if (requestedTenantId !== undefined) {
      tenantId = requestedTenantId;
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

    // Regra global: email único em qualquer tenant.
    // Só valida se o email mudou, e ignora o próprio user.
    if (email && email !== existingUser.email) {
      await this.assertEmailGloballyUnique(email, id);
    }

    // Valida as roles (se vieram)
    if (roleIds && roleIds.length > 0) {
      const found = await this.prisma.role.findMany({
        where: {
          id: { in: roleIds },
          ...(tenantId ? { tenantId } : {}),
          deleted: false,
        },
        select: { id: true },
      });

      if (found.length !== roleIds.length) {
        throw new NotFoundException(
          'Uma ou mais roles não foram encontradas neste tenant',
        );
      }
    }

    const data: {
      name?: string;
      email?: string;
      password?: string;
      tenantId?: string | null;
      userId: string;
      dateAt: Date;
    } = {
      userId: actor.id,
      dateAt: new Date(),
    };

    if (name !== undefined) {
      data.name = name;
    }

    if (email !== undefined) {
      data.email = email;
    }

    if (tenantId !== existingUser.tenantId) {
      data.tenantId = tenantId;
    }

    if (password !== undefined) {
      data.password = await bcrypt.hash(password, 12);
    }

    const user = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id },
        data,
      });

      if (roleIds !== undefined) {
        const current = await tx.userRole.findMany({
          where: { userId: id },
          select: { roleId: true },
        });
        const currentSet = new Set(current.map((ur) => ur.roleId));
        const newSet = new Set(roleIds);

        const toAdd = [...newSet].filter((r) => !currentSet.has(r));
        const toRemove = [...currentSet].filter((r) => !newSet.has(r));

        if (toRemove.length > 0) {
          await tx.userRole.deleteMany({
            where: {
              userId: id,
              roleId: { in: toRemove },
            },
          });
        }

        if (toAdd.length > 0) {
          await tx.userRole.createMany({
            data: toAdd.map((roleId) => ({
              userId: id,
              roleId,
            })),
            skipDuplicates: true,
          });
        }
      }

      return updated;
    });

    await this.permissionsCache.invalidateForUser(id);

    const { password: _, ...result } = user;
    return result;
  }

  async remove(
    id: string,
    actor: {
      id: string;
      tenantId: string | null;
    },
  ) {
    const existingUser = await this.prisma.user.findFirst({
      where: {
        id,
        ...(actor.tenantId !== null ? { tenantId: actor.tenantId } : {}),
        deleted: false,
      },
    });

    if (!existingUser) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        deleted: true,
        userId: actor.id,
        dateAt: new Date(),
      },
      select: {
        id: true,
        tenantId: true,
        name: true,
        email: true,
        dateAt: true,
        userId: true,
      },
    });

    await this.permissionsCache.invalidateForUser(id);

    return user;
  }

    async invite(
    id: string,
    actor: {
      id: string;
      tenantId: string | null;
    },
  ): Promise<{ message: string }> {
    const user = await this.prisma.user.findFirst({
      where: {
        id,
        ...(actor.tenantId !== null ? { tenantId: actor.tenantId } : {}),
        deleted: false,
      },
    });

    if (!user) {
      throw new NotFoundException('Usuario nao encontrado');
    }

    const rawToken = await this.verificationTokens.create(
      user.id,
      'invite',
    );

    const url = await this.verificationTokens.buildSetPasswordUrl(
      user.id,
      rawToken,
    );

    await this.mailService.send({
      to: user.email,
      subject: 'Bem-vindo — defina sua senha',
      text: [
        `Ola ${user.name ?? user.email},`,
        '',
        'Voce foi convidado para acessar o sistema.',
        'Defina sua senha no link abaixo:',
        '',
        url,
        '',
        'Se voce nao esperava este convite, ignore este email.',
      ].join('\n'),
    });

    return { message: 'Convite enviado' };
  }
}
