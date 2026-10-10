import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Request } from 'express';

/**
 * Throttler customizado pro /auth/login.
 *
 * Usa uma chave composta: IP + EMAIL.
 *
 * Motivo: um atacante pode trocar de IP (VPN), mas o email alvo
 * e o mesmo. Ou pode martelar o mesmo IP com varios emails.
 *
 * Com IP+email juntos, ele precisa acertar os DOIS pra brute-forcar
 * uma conta especifica.
 */
@Injectable()
export class LoginThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Request): Promise<string> {
    const email = (req.body as { email?: string })?.email ?? '';
    const ip = req.ip ?? 'unknown';

    return `ip:${ip}|email:${email.toLowerCase()}`;
  }
}