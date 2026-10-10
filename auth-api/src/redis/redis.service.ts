import {
  Injectable,
  Logger,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.getOrThrow<string>('REDIS_HOST');
    const port = this.configService.getOrThrow<number>('REDIS_PORT');
    const password =
      this.configService.get<string>('REDIS_PASSWORD');

    this.client = new Redis({
      host,
      port,
      password,
      lazyConnect: false,
    });

    this.client.on('connect', () => {
      this.logger.log(`Redis conectado em ${host}:${port}`);
    });

    this.client.on('error', (err) => {
      this.logger.error('Erro no Redis', err);
    });
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(
    key: string,
    value: string,
    ttlSeconds?: number,
  ): Promise<void> {
    if (ttlSeconds !== undefined) {
      await this.client.set(key, value, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async delByPattern(pattern: string): Promise<number> {
    let cursor = '0';
    let deleted = 0;

    do {
      const [nextCursor, keys] = await this.client.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        100,
      );
      cursor = nextCursor;

      if (keys.length > 0) {
        deleted += await this.client.del(...keys);
      }
    } while (cursor !== '0');

    return deleted;
  }
    /**
   * Devolve o cliente ioredis cru.
   * Usado por bibliotecas externas (ex: ThrottlerStorageRedisService)
   * que precisam falar diretamente com o Redis.
   */
  getClient(): Redis {
    return this.client;
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
    this.logger.log('Conexão com Redis encerrada');
  }
}