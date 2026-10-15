import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';

export interface GoogleProfile {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
  picture: string | null;
}

@Injectable()
export class GoogleClient {
  private readonly logger = new Logger(GoogleClient.name);
  private readonly client: OAuth2Client;
  private readonly clientId: string;
  private readonly callbackUrl: string;

  constructor(private readonly config: ConfigService) {
    this.clientId = this.config.getOrThrow<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.config.getOrThrow<string>('GOOGLE_CLIENT_SECRET');
    this.callbackUrl = this.config.getOrThrow<string>('GOOGLE_CALLBACK_URL');

    this.client = new OAuth2Client({
      clientId: this.clientId,
      clientSecret,
      redirectUri: this.callbackUrl,
    });
  }

  /**
   * Monta a URL pra onde o browser deve ser redirecionado.
   * O `state` e gerado pelo OAuthService e validado no callback.
   */
  buildAuthUrl(state: string): string {
    return this.client.generateAuthUrl({
      access_type: 'online',       // nao precisamos de refresh_token do Google
      scope: ['openid', 'email', 'profile'],
      state,
      prompt: 'select_account',    // sempre mostra "escolha uma conta"
    });
  }

  /**
   * Troca o `code` por tokens, valida o id_token e devolve o perfil.
   * Lanca UnauthorizedException se algo estiver errado.
   */
  async exchangeCodeForProfile(code: string): Promise<GoogleProfile> {
    let ticket;
    try {
      const { tokens } = await this.client.getToken(code);
      if (!tokens.id_token) {
        throw new UnauthorizedException('Google nao retornou id_token');
      }

      ticket = await this.client.verifyIdToken({
        idToken: tokens.id_token,
        audience: this.clientId,
      });
    } catch (err) {
      this.logger.warn(`Falha ao validar id_token do Google: ${String(err)}`);
      throw new UnauthorizedException('Falha na autenticacao com o Google');
    }

    const payload = ticket.getPayload();
    if (!payload || !payload.sub || !payload.email) {
      throw new UnauthorizedException('Perfil do Google incompleto');
    }

    return {
      sub: payload.sub,
      email: payload.email,
      emailVerified: payload.email_verified === true,
      name: payload.name ?? null,
      picture: payload.picture ?? null,
    };
  }
}