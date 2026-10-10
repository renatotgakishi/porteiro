import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

import { AuthService } from '../auth.service';

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
   * Extrai o access token de duas fontes, nessa ordem:
   *   1. Cookie httpOnly `access_token` (frontend)
   *   2. Header `Authorization: Bearer <token>` (testes manuais, curl, Swagger)
   */
  private extractToken(request: Request): string | null {
    const cookieToken = request.cookies?.access_token;

    if (typeof cookieToken === 'string' && cookieToken.length > 0) {
      return cookieToken;
    }

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
