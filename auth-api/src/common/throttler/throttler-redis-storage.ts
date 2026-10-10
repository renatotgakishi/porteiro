import { Injectable } from '@nestjs/common';
import type { ThrottlerStorage } from '@nestjs/throttler';
import type Redis from 'ioredis';

/**
 * ThrottlerStorage customizado que usa Redis.
 *
 * Chave: `throttle:{throttlerName}:{tracker}`
 * O tracker e o retorno do getTracker() de cada guard
 * (ex: "email:joao@stark.com", "ip:::1", "user:abc123").
 */
@Injectable()
export class ThrottlerRedisStorage implements ThrottlerStorage {
  constructor(private readonly redis: Redis) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ) {
    const redisKey = `throttle:${throttlerName}:${key}`;

    const totalHits = await this.redis.incr(redisKey);

    if (totalHits === 1) {
      await this.redis.pexpire(redisKey, ttl);
    }

    const pttl = await this.redis.pttl(redisKey);
    const timeToExpire = pttl > 0 ? Math.ceil(pttl / 1000) : 0;

    let isBlocked = false;
    let timeToBlockExpire = 0;

    if (totalHits > limit) {
      isBlocked = true;
      timeToBlockExpire = timeToExpire;

      if (blockDuration > 0 && pttl < blockDuration) {
        await this.redis.pexpire(redisKey, blockDuration);
        timeToBlockExpire = Math.ceil(blockDuration / 1000);
      }
    }

    return {
      totalHits,
      timeToExpire,
      isBlocked,
      timeToBlockExpire,
    };
  }
}