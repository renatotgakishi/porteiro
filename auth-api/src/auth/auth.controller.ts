import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { SetPasswordDto } from './dto/set-password.dto';
import { ThrottlerGuard } from '@nestjs/throttler';

import { Throttle } from '@nestjs/throttler';
import { LoginThrottlerGuard } from '../common/throttler/login-throttler.guard';
import { EmailThrottlerGuard } from '../common/throttler/email-throttler.guard';
import { UserThrottlerGuard } from '../common/throttler/user-throttler.guard';

import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';

import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ApiBearerAuth } from '@nestjs/swagger';

import type { Request, Response } from 'express';
import { ChangePasswordDto } from './dto/change-password.dto';

const ACCESS_TOKEN_COOKIE = 'access_token';
const REFRESH_TOKEN_COOKIE = 'refresh_token';

const ACCESS_TOKEN_MAX_AGE_MS = 15 * 60 * 1000; // 15 minutos
const REFRESH_TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias

// Paths possíveis do cookie de refresh. Usado para limpar
// cookies órfãos que ficaram com paths antigos.
const REFRESH_COOKIE_PATHS = ['/auth/refresh', '/'];
const ACCESS_COOKIE_PATHS = ['/'];

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 3, ttl: 3_600_000 } }) // 3 / 1h
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @UseGuards(LoginThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } }) // 5 / 1min
  async login(
    @Body() dto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const userAgent = request.headers['user-agent'] ?? null;
    const ipAddress = request.ip ?? null;

    const result = await this.authService.login(dto, userAgent, ipAddress);

    // Limpa cookies órfãos (de paths antigos) antes de setar os novos.
    this.clearAuthCookies(response);

    response.cookie(ACCESS_TOKEN_COOKIE, result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: ACCESS_TOKEN_MAX_AGE_MS,
    });

    response.cookie(REFRESH_TOKEN_COOKIE, result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: REFRESH_TOKEN_MAX_AGE_MS,
    });

    return {
      user: result.user,
      permissions: result.permissions,
    };
  }

  @Post('refresh')
  @Throttle({ default: { limit: 30, ttl: 60_000 } }) // 30 / 1min
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken = request.cookies?.[REFRESH_TOKEN_COOKIE] as
      string | undefined;

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token não informado');
    }

    const userAgent = request.headers['user-agent'] ?? null;
    const ipAddress = request.ip ?? null;

    const result = await this.authService.refresh(
      refreshToken,
      userAgent,
      ipAddress,
    );

    // Limpa cookies órfãos antes de setar os novos.
    this.clearAuthCookies(response);

    response.cookie(ACCESS_TOKEN_COOKIE, result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: ACCESS_TOKEN_MAX_AGE_MS,
    });

    response.cookie(REFRESH_TOKEN_COOKIE, result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: REFRESH_TOKEN_MAX_AGE_MS,
    });

    return { message: 'Token renovado' };
  }

  @Post('logout')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const user = (request as any).user as { id: string };
    const refreshToken = request.cookies?.[REFRESH_TOKEN_COOKIE] as
      string | undefined;

    await this.authService.logout(user.id, refreshToken);

    this.clearAuthCookies(response);

    return { message: 'Logout realizado com sucesso' };
  }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  me(@Req() request: any) {
    return request.user;
  }

  @Get('me/permissions')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async myPermissions(@Req() request: any) {
    const permissions = await this.authService.getUserPermissions(
      request.user.id,
    );
    return { permissions };
  }

  @Post('forgot-password')
  @UseGuards(EmailThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 900_000 } }) // 5 / 15min
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.forgotPassword(dto.email);
    return { message: 'Se o email existir, enviaremos instrucoes' };
  }

  @Post('set-password')
  @Throttle({ default: { limit: 10, ttl: 900_000 } }) // 10 / 15min
  async setPassword(@Body() dto: SetPasswordDto) {
    await this.authService.setPassword(dto.token, dto.newPassword);
    return { message: 'Senha atualizada com sucesso' };
  }

  @Post('change-password')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, UserThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 900_000 } }) // 5 / 15min
  async changePassword(@Body() dto: ChangePasswordDto, @Req() request: any) {
    await this.authService.changePassword(
      request.user.id,
      dto.currentPassword,
      dto.newPassword,
    );
    return { message: 'Senha alterada com sucesso' };
  }

  /**
   * Remove os cookies de auth em TODOS os paths possíveis.
   * Necessário porque cookies com paths diferentes coexistem no browser,
   * e o `clearCookie` só remove o que casa exatamente com o path informado.
   */
  private clearAuthCookies(response: Response): void {
    for (const path of ACCESS_COOKIE_PATHS) {
      response.clearCookie(ACCESS_TOKEN_COOKIE, { path });
    }
    for (const path of REFRESH_COOKIE_PATHS) {
      response.clearCookie(REFRESH_TOKEN_COOKIE, { path });
    }
  }
}
