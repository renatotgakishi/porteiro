import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'crypto';

import { PrismaService } from '../../prisma/prisma.service';
import { AuthService } from '../auth.service';
import { GoogleClient } from './google.client';

@Injectable()
export class OAuthService {
  private readonly logger = new Logger(OAuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly google: GoogleClient,
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Gera um state aleatorio (protecao CSRF) e a URL do Google.
   */
  startGoogleFlow(): { redirectUrl: string; state: string } {
    const state = randomBytes(32).toString('hex');
    const redirectUrl = this.google.buildAuthUrl(state);
    return { redirectUrl, state };
  }

  /**
   * Processa o callback do Google.
   *
   * Regras (Cenario B — OAuth so para users existentes):
   *   1. email_verified do Google precisa ser true
   *   2. Email precisa casar com um User existente (deleted=false)
   *   3. Se ja existe Account pro (google, sub), valida que aponta pro mesmo user
   *   4. Se nao existe Account, cria vinculando ao user
   *   5. Marca emailVerified local se ainda nao estava
   *   6. Emite sessao (mesma do login por senha)
   *
   * NAO cria User novo. Se nao achar, rejeita.
   */
  async handleGoogleCallback(
    code: string,
    userAgent: string | null,
    ipAddress: string | null,
  ) {
    const profile = await this.google.exchangeCodeForProfile(code);

    if (!profile.emailVerified) {
      throw new UnauthorizedException(
        'Email do Google nao esta verificado',
      );
    }

    const user = await this.prisma.user.findFirst({
      where: { email: profile.email, deleted: false },
    });

    if (!user) {
      throw new UnauthorizedException(
        'Voce precisa ser convidado antes de entrar com Google',
      );
    }

    // Valida tenant/licenca (mesmas regras do login por senha)
    if (user.tenantId) {
      const tenant = await this.prisma.tenant.findFirst({
        where: { id: user.tenantId, deleted: false },
      });
      if (!tenant) {
        throw new UnauthorizedException('Empresa nao encontrada');
      }
      if (tenant.licenseExpiresAt < new Date()) {
        throw new UnauthorizedException('Licenca da empresa expirada');
      }
    }

    // Vinculacao do Account
    const existingAccount = await this.prisma.account.findUnique({
      where: {
        provider_providerAccountId: {
          provider: 'google',
          providerAccountId: profile.sub,
        },
      },
    });

    if (existingAccount && existingAccount.userId !== user.id) {
      // sub do Google ja vinculado a outro user. Nunca re-vincula.
      this.logger.warn(
        `Conflito de Account: google:${profile.sub} ja aponta pra user ${existingAccount.userId}, tentativa em ${user.id}`,
      );
      throw new UnauthorizedException(
        'Esta conta Google ja esta vinculada a outro usuario',
      );
    }

    if (!existingAccount) {
      await this.prisma.account.create({
        data: {
          userId: user.id,
          provider: 'google',
          providerAccountId: profile.sub,
        },
      });
      this.logger.log(
        `Account Google vinculada: user=${user.id} sub=${profile.sub}`,
      );
    }

    // Marca emailVerified local (se ainda nao estava) — Decisao 2
    if (!user.emailVerified) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: new Date() },
      });
    }

    // Emite sessao identica a do login por senha
    return this.authService.issueSessionForUser(
      user,
      userAgent,
      ipAddress,
    );
  }
}