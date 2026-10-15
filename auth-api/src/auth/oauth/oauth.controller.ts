import {
  Controller,
  Get,
  Query,
  Req,
  Res,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';

import { OAuthService } from './oauth.service';
import {
  accessCookieName,
  refreshCookieName,
  type ClientPrefix,
} from '../cookie-prefix';

const OAUTH_STATE_COOKIE = 'oauth_state';
const STATE_MAX_AGE_MS = 5 * 60 * 1000; // 5 min

const ACCESS_TOKEN_MAX_AGE_MS = 15 * 60 * 1000; // 15 min
const REFRESH_TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias

/**
 * OAuth e exclusivo do starter-web hoje. Nao vem Origin no callback
 * (e navegacao top-level do Google), entao hardcodamos o prefixo.
 * Quando houver OAuth no admin-panel, passar ?client=admin na URL
 * de /auth/oauth/google e ler aqui.
 */
const OAUTH_CLIENT_PREFIX: ClientPrefix = 'starter_';

@ApiTags('OAuth')
@Controller('auth/oauth')
export class OAuthController {
  private readonly logger = new Logger(OAuthController.name);

  constructor(
    private readonly oauthService: OAuthService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Passo 1 — usuario clica "Entrar com Google".
   * Gera state, seta cookie httpOnly, redireciona pro Google.
   */
  @Get('google')
  startGoogle(@Res() res: Response): void {
    const { redirectUrl, state } = this.oauthService.startGoogleFlow();

    res.cookie(OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: STATE_MAX_AGE_MS,
    });

    res.redirect(redirectUrl);
  }

  /**
   * Passo 2 — Google volta com ?code=...&state=...
   * Valida state, troca code por perfil, emite cookies, redireciona.
   */
  @Get('google/callback')
  async googleCallback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') error: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const successRedirect = this.config.getOrThrow<string>(
      'OAUTH_SUCCESS_REDIRECT',
    );
    const failureRedirect = this.config.getOrThrow<string>(
      'OAUTH_FAILURE_REDIRECT',
    );

    // Google pode mandar ?error=access_denied se o user cancelar
    if (error) {
      this.logger.warn(`Google retornou erro: ${error}`);
      this.redirectFailure(res, failureRedirect, error);
      return;
    }

    if (!code || !state) {
      this.redirectFailure(res, failureRedirect, 'missing_code_or_state');
      return;
    }

    // Valida CSRF: state da query precisa casar com o cookie
    const cookieState = req.cookies?.[OAUTH_STATE_COOKIE] as string | undefined;
    res.clearCookie(OAUTH_STATE_COOKIE, { path: '/' });

    if (!cookieState || cookieState !== state) {
      this.logger.warn('State invalido no callback do Google');
      this.redirectFailure(res, failureRedirect, 'invalid_state');
      return;
    }

    const userAgent = req.headers['user-agent'] ?? null;
    const ipAddress = req.ip ?? null;

    try {
      const result = await this.oauthService.handleGoogleCallback(
        code,
        userAgent,
        ipAddress,
      );

      const isProd = process.env.NODE_ENV === 'production';

      res.cookie(accessCookieName(OAUTH_CLIENT_PREFIX), result.accessToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        path: '/',
        maxAge: ACCESS_TOKEN_MAX_AGE_MS,
      });

      res.cookie(refreshCookieName(OAUTH_CLIENT_PREFIX), result.refreshToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        path: '/',
        maxAge: REFRESH_TOKEN_MAX_AGE_MS,
      });

      res.redirect(successRedirect);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'oauth_failed';
      this.logger.warn(`Falha no callback OAuth: ${message}`);
      this.redirectFailure(res, failureRedirect, message);
    }
  }

  private redirectFailure(
    res: Response,
    baseUrl: string,
    reason: string,
  ): void {
    const sep = baseUrl.includes('?') ? '&' : '?';
    res.redirect(`${baseUrl}${sep}error=${encodeURIComponent(reason)}`);
  }
}