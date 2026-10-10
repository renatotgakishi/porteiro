import { Injectable, Logger } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

export interface CreateSessionResult {
  rawToken: string;
  sessionId: string;
}

@Injectable()
export class SessionsService {
  private readonly logger = new Logger(SessionsService.name);

  /**
   * TTL do refresh token. Sliding window: renovado a cada rotação.
   * 7 dias por enquanto. Depois alinhar com tenant.licenseExpiresAt.
   */
  private readonly REFRESH_TTL_DAYS = 7;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Gera um refresh token aleatório (256 bits) e devolve em hex.
   * O valor bruto NUNCA é persistido. Só o hash.
   */
  private generateRawToken(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * SHA-256 do token. Determinístico: mesmo input → mesmo output.
   */
  hashToken(rawToken: string): string {
    return createHash('sha256').update(rawToken).digest('hex');
  }

  /**
   * Cria uma nova Session para o usuário.
   */
  async createSession(
    userId: string,
    userAgent?: string | null,
    ipAddress?: string | null,
  ): Promise<CreateSessionResult> {
    const rawToken = this.generateRawToken();
    const refreshTokenHash = this.hashToken(rawToken);

    const expiresAt = new Date();
    expiresAt.setDate(
      expiresAt.getDate() + this.REFRESH_TTL_DAYS,
    );

    const session = await this.prisma.session.create({
      data: {
        userId,
        refreshTokenHash,
        expiresAt,
        userAgent: userAgent ?? null,
        ipAddress: ipAddress ?? null,
      },
      select: {
        id: true,
      },
    });

    this.logger.debug(
      `Session criada para user=${userId} id=${session.id}`,
    );

    return {
      rawToken,
      sessionId: session.id,
    };
  }

  /**
   * Busca uma Session ativa pelo token bruto.
   * "Ativa" = não revogada e não expirada.
   * Devolve null se não existir, estiver revogada ou expirada.
   */
  async findActiveByRawToken(rawToken: string) {
    const session = await this.findByRawTokenIncludingRevoked(
      rawToken,
    );

    if (!session) {
      return null;
    }

    if (session.revokedAt) {
      return null;
    }

    if (session.expiresAt < new Date()) {
      return null;
    }

    return session;
  }

  /**
   * Busca uma Session pelo token bruto, incluindo revogadas.
   * Usado na detecção de reuso (precisa saber se existiu mas foi revogada).
   */
  async findByRawTokenIncludingRevoked(rawToken: string) {
    const refreshTokenHash = this.hashToken(rawToken);

    return this.prisma.session.findUnique({
      where: { refreshTokenHash },
    });
  }

  /**
   * Revoga uma Session específica.
   */
  async revoke(
    sessionId: string,
    reason: string,
  ): Promise<void> {
    await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        revokedAt: new Date(),
        revokedReason: reason,
      },
    });

    this.logger.debug(
      `Session revogada: id=${sessionId} reason=${reason}`,
    );
  }

  /**
   * Revoga todas as Sessions ativas de um usuário.
   */
  async revokeAllForUser(
    userId: string,
    reason: string,
  ): Promise<number> {
    const result = await this.prisma.session.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
        revokedReason: reason,
      },
    });

    if (result.count > 0) {
      this.logger.debug(
        `Sessões revogadas: user=${userId} count=${result.count} reason=${reason}`,
      );
    }

    return result.count;
  }

  /**
   * Rotaciona uma Session: revoga a atual, cria uma nova e
   * aponta replacedBySessionId da antiga para a nova.
   * Tudo em uma transação para consistência.
   *
   * Devolve o token bruto da nova Session (que vai pro cookie)
   * e o id da nova Session.
   */
  async rotate(
    currentSessionId: string,
    userId: string,
    userAgent?: string | null,
    ipAddress?: string | null,
  ): Promise<CreateSessionResult> {
    const rawToken = this.generateRawToken();
    const refreshTokenHash = this.hashToken(rawToken);

    const expiresAt = new Date();
    expiresAt.setDate(
      expiresAt.getDate() + this.REFRESH_TTL_DAYS,
    );

    const newSessionId = await this.prisma.$transaction(
      async (tx) => {
        const newSession = await tx.session.create({
          data: {
            userId,
            refreshTokenHash,
            expiresAt,
            userAgent: userAgent ?? null,
            ipAddress: ipAddress ?? null,
          },
          select: { id: true },
        });

        await tx.session.update({
          where: { id: currentSessionId },
          data: {
            revokedAt: new Date(),
            revokedReason: 'rotated',
            replacedBySessionId: newSession.id,
          },
        });

        return newSession.id;
      },
    );

    this.logger.debug(
      `Session rotacionada: old=${currentSessionId} new=${newSessionId}`,
    );

    return {
      rawToken,
      sessionId: newSessionId,
    };
  }

  /**
   * Revoga a cadeia inteira a partir de uma Session.
   * Usado quando reuso é detectado: revoga a original e todas
   * as que a substituíram.
   *
   * Anda para frente seguindo replacedBySessionId e para trás
   * seguindo replacesSession (não precisa, porque o reuso
   * sempre é detectado na ponta da cadeia).
   */
  async revokeChain(startSessionId: string): Promise<void> {
    let currentId: string | null = startSessionId;
    const revokedIds: string[] = [];

    while (currentId) {
      const session: {
        id: string;
        replacedBySessionId: string | null;
        revokedAt: Date | null;
      } | null = await this.prisma.session.findUnique({
        where: { id: currentId },
        select: {
          id: true,
          replacedBySessionId: true,
          revokedAt: true,
        },
      });

      if (!session) {
        break;
      }

      if (!session.revokedAt) {
        await this.prisma.session.update({
          where: { id: session.id },
          data: {
            revokedAt: new Date(),
            revokedReason: 'reuse_detected',
          },
        });
        revokedIds.push(session.id);
      }

      currentId = session.replacedBySessionId;
    }

    if (revokedIds.length > 0) {
      this.logger.warn(
        `Cadeia revogada por reuso: ${revokedIds.join(' -> ')}`,
      );
    }
  }
}