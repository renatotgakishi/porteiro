import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

import { AuthService } from '../auth.service';
import {
  detectClientPrefix,
  accessCookieName,
  type ClientPrefix,
} from '../cookie-prefix';

// Prefixos que o guard procura, em ordem de prioridade.
// 'admin_' e 'starter_' primeiro (novo formato).
// '' (vazio) por ultimo, pra compatibilidade com cookies antigos
// durante a transicao.
const PREFIXES_TO_TRY: ClientPrefix[] = ['admin_', 'starter_', ''];

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Token não informado');
    }

    try {
      const payload = await this.jwtService.verifyAsync<{
        sub: string;
        tenantId: string | null;
      }>(token);

      const user = await this.authService.validateTokenPayload(payload);

      (request as any).user = user;

      return true;
    } catch {
      throw new UnauthorizedException('Token inválido ou expirado');
    }
  }

  /**
   * Extrai o access token das seguintes fontes, nessa ordem:
   *   1. Cookie do prefixo do cliente detectado (ex: 'admin_access_token')
   *   2. Cookie de qualquer outro prefixo conhecido (fallback)
   *   3. Cookie 'access_token' sem prefixo (compatibilidade)
   *   4. Header 'Authorization: Bearer <token>' (curl, Swagger)
   */
  private extractToken(request: Request): string | null {
    const detected = detectClientPrefix(request);

    // Monta a lista: prefixo detectado primeiro, depois os outros.
    const order: ClientPrefix[] = [
      detected,
      ...PREFIXES_TO_TRY.filter((p) => p !== detected),
    ];

    // Tenta cada prefixo. O primeiro cookie nao-vazio ganha.
    for (const prefix of order) {
      const cookieToken = request.cookies?.[accessCookieName(prefix)];

      if (typeof cookieToken === 'string' && cookieToken.length > 0) {
        return cookieToken;
      }
    }

    // Fallback: header Authorization Bearer.
    const authorization = request.headers.authorization;

    if (!authorization) {
      return null;
    }

    const [type, token] = authorization.split(' ');

    if (type !== 'Bearer' || !token) {
      return null;
    }

    return token;
  }
}