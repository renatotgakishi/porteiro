import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class PermissionsResolverService {
  private readonly CACHE_TTL = 300;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async resolve(userId: string): Promise<string[]> {
    const cacheKey = `perms:user:${userId}`;

    // 1. Tenta buscar no Redis
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    // 2. Redis não possui → consulta PostgreSQL
    const permissions = await this.prisma.permission.findMany({
      where: {
        deleted: false,
        roles: {
          some: {
            role: {
              deleted: false,
              users: {
                some: {
                  userId,
                },
              },
            },
          },
        },
      },
      select: {
        key: true,
      },
    });

    const permissionKeys = permissions.map(
      (permission) => permission.key,
    );

    // 3. Grava no Redis por 5 minutos
    await this.redis.set(
      cacheKey,
      JSON.stringify(permissionKeys),
      this.CACHE_TTL,
    );

    return permissionKeys;
  }
}