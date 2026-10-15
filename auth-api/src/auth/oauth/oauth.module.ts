import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AuthModule } from '../auth.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { GoogleClient } from './google.client';
import { OAuthController } from './oauth.controller';
import { OAuthService } from './oauth.service';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    AuthModule,   // pra reusar AuthService.issueSessionForUser
  ],
  controllers: [OAuthController],
  providers: [GoogleClient, OAuthService],
})
export class OAuthModule {}