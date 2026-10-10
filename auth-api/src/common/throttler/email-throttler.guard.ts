import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Request } from 'express';

/**
 * Throttler que usa o EMAIL do body como chave (em vez do IP).
 *
 * Usado em endpoints publicos onde o atacante pode trocar de IP
 * facilmente (VPN, proxy), mas o email alvo e o mesmo:
 *   - forgot-password
 *
 * Se nao houver email no body, cai pro IP (fallback).
 */
@Injectable()
export class EmailThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Request): Promise<string> {
    const email = (req.body as { email?: string })?.email;
    const tracker =
      typeof email === 'string' && email.length > 0
        ? `email:${email.toLowerCase()}`
        : `ip:${req.ip ?? 'unknown'}`;

    console.log('[EmailThrottlerGuard] tracker:', tracker);
    return tracker;
  }
}
