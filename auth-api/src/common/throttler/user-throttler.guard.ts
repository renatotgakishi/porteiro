import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Request } from 'express';

/**
 * Throttler que usa o USER ID (do JWT) como chave.
 *
 * Usado em endpoints autenticados onde queremos limitar por usuario
 * (nao por IP, porque varios usuarios podem compartilhar o mesmo IP
 * em uma empresa/rede):
 *   - change-password
 *
 * Fallback pro IP se o user nao estiver no request (nao autenticado).
 */
@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Request): Promise<string> {
    const user = (req as any).user as { id?: string } | undefined;

    if (user?.id) {
      return `user:${user.id}`;
    }

    return `ip:${req.ip ?? 'unknown'}`;
  }
}