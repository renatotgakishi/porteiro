import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LoggerConfigModule } from './logger/logger.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { RedisService } from './redis/redis.service';
import { AuthModule } from './auth/auth.module';
import { CategoriesModule } from './categories/categories.module';
import { ProductsModule } from './products/products.module';
import { TenantsModule } from './tenants/tenants.module';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { PermissionsModule } from './permissions/permissions.module';
import { UserRolesModule } from './user-roles/user-roles.module';
import { SessionsModule } from './sessions/sessions.module';
import { MailModule } from './mail/mail.module';
import { ThrottlerRedisStorage } from './common/throttler/throttler-redis-storage';
import { ThemesModule } from './themes/themes.module';
import { OAuthModule } from './auth/oauth/oauth.module';


@Module({
  imports: [
    LoggerConfigModule,
    RedisModule,
    PrismaModule,

    // Throttler global: 100 req / min por IP.
    // Endpoints especificos sobrescrevem com @Throttle({ default: {...} }).
    ThrottlerModule.forRootAsync({
      imports: [RedisModule],
      inject: [RedisService],
      useFactory: (redisService: RedisService) => ({
        throttlers: [
          {
            name: 'default',
            ttl: 60_000, // 1 min
            limit: 100, // 100 req/min
          },
        ],
        storage: new ThrottlerRedisStorage(redisService.getClient()),
      }),
    }),

    AuthModule,
    CategoriesModule,
    ProductsModule,
    TenantsModule,
    UsersModule,
    RolesModule,
    PermissionsModule,
    UserRolesModule,
    SessionsModule,
    MailModule,
    ThemesModule,
    OAuthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,    
  ],
})
export class AppModule {}