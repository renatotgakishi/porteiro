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
  HttpCode,
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

import {
  detectClientPrefix,
  accessCookieName,
  refreshCookieName,
  type ClientPrefix,
} from './cookie-prefix';

const ACCESS_TOKEN_MAX_AGE_MS = 15 * 60 * 1000; // 15 minutos
const REFRESH_TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias

// Paths possiveis do cookie de refresh. Usado para limpar
// cookies orfaos que ficaram com paths antigos.
const REFRESH_COOKIE_PATHS = ['/auth/refresh', '/'];
const ACCESS_COOKIE_PATHS = ['/'];

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 3, ttl: 3_600_000 } }) // 3 / 1h
  register(@Body() dto: RegisterDto) {
    // 201 Created — register Cria um recurso (user).
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(200)
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

    const prefix = detectClientPrefix(request);

    // Limpa SO os cookies do prefixo do cliente atual (+ legado sem prefixo).
    // Nunca toca no prefixo de outro app.
    this.clearAuthCookies(response, prefix);

    this.setAuthCookies(response, prefix, result.accessToken, result.refreshToken);

    return {
      user: result.user,
      permissions: result.permissions,
      accessToken: result.accessToken, // conveniencia pra Swagger/curl
    };
  }

  @Post('refresh')
  @HttpCode(200)
  @Throttle({ default: { limit: 30, ttl: 60_000 } }) // 30 / 1min
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const prefix = detectClientPrefix(request);

    // Tenta o cookie do prefixo detectado. Fallback pro sem prefixo
    // (compatibilidade durante a transicao).
    const refreshToken =
      (request.cookies?.[refreshCookieName(prefix)] as string | undefined) ??
      (request.cookies?.['refresh_token'] as string | undefined);

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

    // Limpa SO os cookies do prefixo do cliente atual (+ legado sem prefixo).
    this.clearAuthCookies(response, prefix);

    this.setAuthCookies(response, prefix, result.accessToken, result.refreshToken);

    return { message: 'Token renovado' };
  }

  @Post('logout')
  @HttpCode(200)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const user = (request as any).user as { id: string };

    const prefix = detectClientPrefix(request);

    const refreshToken =
      (request.cookies?.[refreshCookieName(prefix)] as string | undefined) ??
      (request.cookies?.['refresh_token'] as string | undefined);

    await this.authService.logout(user.id, refreshToken);

    // Limpa SO os cookies do prefixo do cliente atual (+ legado sem prefixo).
    this.clearAuthCookies(response, prefix);

    return { message: 'Logout realizado com sucesso' };
  }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async me(@Req() req: Request & { user: { id: string } }) {
    const userId = req.user.id;
    return this.authService.getMeWithTheme(userId);
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
  @HttpCode(200)
  @UseGuards(EmailThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 900_000 } }) // 5 / 15min
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.forgotPassword(dto.email);
    return { message: 'Se o email existir, enviaremos instrucoes' };
  }

  @Post('set-password')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 900_000 } }) // 10 / 15min
  async setPassword(@Body() dto: SetPasswordDto) {
    await this.authService.setPassword(dto.token, dto.newPassword);
    return { message: 'Senha atualizada com sucesso' };
  }

  @Post('change-password')
  @HttpCode(200)
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
   * Seta os cookies de auth, com o prefixo do cliente detectado.
   */
  private setAuthCookies(
    response: Response,
    prefix: ClientPrefix,
    accessToken: string,
    refreshToken: string,
  ): void {
    const isProd = process.env.NODE_ENV === 'production';

    response.cookie(accessCookieName(prefix), accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: ACCESS_TOKEN_MAX_AGE_MS,
    });

    response.cookie(refreshCookieName(prefix), refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: REFRESH_TOKEN_MAX_AGE_MS,
    });
  }

  /**
   * Remove os cookies de auth do prefixo do cliente ATUAL + o prefixo
   * vazio (legado da transicao).
   *
   * IMPORTANTE: nao limpa o prefixo de OUTROS apps. Se o admin-panel
   * loga, nao pode derrubar a sessao do starter-web (e vice-versa).
   *
   * Necessario limpar varios paths porque cookies com paths diferentes
   * coexistem no browser, e o clearCookie so remove o que casa exato.
   */
  private clearAuthCookies(response: Response, prefix: ClientPrefix): void {
    // Limpa o prefixo do cliente atual + o legado (sem prefixo).
    // NUNCA limpa o prefixo de outro app.
    const prefixesToClear: ClientPrefix[] = [prefix, ''];

    for (const p of prefixesToClear) {
      for (const path of ACCESS_COOKIE_PATHS) {
        response.clearCookie(accessCookieName(p), { path });
      }
      for (const path of REFRESH_COOKIE_PATHS) {
        response.clearCookie(refreshCookieName(p), { path });
      }
    }
  }
}