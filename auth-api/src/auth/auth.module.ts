import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PermissionGuard } from './guards/permission.guard';
import { PermissionsResolverService } from './services/permissions-resolver.service';
import { PermissionsCacheService } from './services/permissions-cache.service';
import { SessionsService } from './services/sessions.service';
import { VerificationTokenService } from './services/verification-token.service';

@Module({
  imports: [
    PrismaModule,
    ConfigModule,

    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get('JWT_EXPIRES_IN') ?? '15m',
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtAuthGuard,
    PermissionGuard,
    PermissionsResolverService,
    PermissionsCacheService,
    SessionsService,
    VerificationTokenService,
  ],
  exports: [
    AuthService,
    JwtModule,
    JwtAuthGuard,
    PermissionGuard,
    PermissionsResolverService,
    PermissionsCacheService,
    SessionsService,
    VerificationTokenService,
  ],
})
export class AuthModule {}
