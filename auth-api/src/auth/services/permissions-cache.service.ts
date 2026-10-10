import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class PermissionsCacheService {
  private readonly logger = new Logger(
    PermissionsCacheService.name,
  );

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Invalida o cache de um único usuário.
   * Usar após alterar UserRole (assign/remove) ou
   * quando o próprio usuário muda de forma que afete
   * suas permissions.
   */
  async invalidateForUser(userId: string): Promise<void> {
    const key = `perms:user:${userId}`;
    await this.redis.del(key);
    this.logger.debug(`Cache invalidado: ${key}`);
  }

  /**
   * Invalida o cache de todos os usuários que possuem
   * uma determinada role.
   * Usar após alterar RolePermission (assign/remove),
   * após soft delete de role, ou após mover role de tenant.
   */
  async invalidateForRole(roleId: string): Promise<void> {
    const userRoles = await this.prisma.userRole.findMany({
      where: { roleId },
      select: { userId: true },
    });

    const userIds = userRoles.map((ur) => ur.userId);

    if (userIds.length === 0) {
      return;
    }

    await this.invalidateForUsers(userIds);
  }

  /**
   * Invalida o cache de vários usuários de uma vez.
   */
  async invalidateForUsers(userIds: string[]): Promise<void> {
    if (userIds.length === 0) {
      return;
    }

    const keys = userIds.map((id) => `perms:user:${id}`);

    await Promise.all(keys.map((key) => this.redis.del(key)));

    this.logger.debug(
      `Cache invalidado para ${userIds.length} usuário(s)`,
    );
  }
}