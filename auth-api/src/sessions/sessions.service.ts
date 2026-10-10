import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as geoip from 'geoip-lite';
import {
  GeoLocationDto,
  SessionChainDto,
  SessionItemDto,
  SessionsListResponseDto,
} from './dto/session-response.dto';
import { createHash } from 'crypto';

const IP_CHANGE_WARN_MS = 15 * 60 * 1000; // 15 min
const COUNTRY_CHANGE_DANGER_MS = 6 * 60 * 60 * 1000; // 6h

interface SessionRow {
  id: string;
  userId: string;
  refreshTokenHash: string;
  createdAt: Date;
  lastUsedAt: Date | null;
  expiresAt: Date;
  revokedAt: Date | null;
  revokedReason: string | null;
  replacedBySessionId: string | null;
  userAgent: string | null;
  ipAddress: string | null;
}

@Injectable()
export class SessionsService {
  private readonly logger = new Logger(SessionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * SHA-256 do token. Determinístico: mesmo input → mesmo output.
   * Usado para marcar isCurrent na listagem.
   */
  hashToken(rawToken: string): string {
    return createHash('sha256').update(rawToken).digest('hex');
  }

  /**
   * Resolve geolocalização a partir do IP. Sem persistir nada.
   * IPs privados/loopback (Docker, dev) retornam null.
   */
  private resolveGeo(ip: string | null): GeoLocationDto {
    if (!ip) {
      return { country: null, countryCode: null, city: null, region: null };
    }
    const clean = ip.replace(/^::ffff:/, '');
    const lookup = geoip.lookup(clean);
    if (!lookup) {
      return { country: null, countryCode: null, city: null, region: null };
    }
    return {
      country: lookup.country ?? null,
      countryCode: lookup.country ?? null,
      city: lookup.city ?? null,
      region: lookup.region ?? null,
    };
  }

  /**
   * Lista as sessões de um usuário agrupadas em cadeias de rotação (RTR).
   * Sessões órfãs (sem replacedBySessionId e sem replacesSession)
   * viram cadeias de 1 elemento.
   */
  async listForUser(
    userId: string,
    currentRawTokenHash: string | null,
  ): Promise<SessionsListResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const rows = (await this.prisma.session.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        userId: true,
        refreshTokenHash: true,
        createdAt: true,
        lastUsedAt: true,
        expiresAt: true,
        revokedAt: true,
        revokedReason: true,
        replacedBySessionId: true,
        userAgent: true,
        ipAddress: true,
      },
    })) as SessionRow[];

    const chains = this.buildChains(rows);
    const now = Date.now();

    const enriched: SessionChainDto[] = chains.map((chain) => {
      const items: SessionItemDto[] = chain.map((s) => {
        const isActive = s.revokedAt === null && s.expiresAt.getTime() > now;
        const isCurrent =
          currentRawTokenHash !== null &&
          s.refreshTokenHash === currentRawTokenHash;
        return {
          id: s.id,
          isCurrent,
          isActive,
          createdAt: s.createdAt.toISOString(),
          lastUsedAt: s.lastUsedAt ? s.lastUsedAt.toISOString() : null,
          expiresAt: s.expiresAt.toISOString(),
          revokedAt: s.revokedAt ? s.revokedAt.toISOString() : null,
          revokedReason: s.revokedReason,
          userAgent: s.userAgent,
          ipAddress: s.ipAddress,
          geo: this.resolveGeo(s.ipAddress),
        };
      });

      const { level, reason } = this.detectAnomaly(chain);

      return {
        chainId: chain[0].id,
        sessions: items,
        anomalyLevel: level,
        anomalyReason: reason,
      };
    });

    const total = rows.length;
    const activeCount = rows.filter(
      (r) => r.revokedAt === null && r.expiresAt.getTime() > now,
    ).length;

    return { userId, chains: enriched, total, activeCount };
  }

  /**
   * Agrupa linhas em cadeias seguindo replacedBySessionId.
   * Cada cadeia começa numa raiz (ninguém aponta pra ela) e segue
   * replacedBySessionId até null. Ordem: cronológica.
   */
  private buildChains(rows: SessionRow[]): SessionRow[][] {
    const byId = new Map(rows.map((r) => [r.id, r]));

    // Raiz = sessão que NÃO foi substituída por ninguém.
    // (ninguém tem replacedBySessionId apontando pra ela)
    const roots = rows.filter(
      (r) => !rows.some((o) => o.replacedBySessionId === r.id),
    );

    const chains: SessionRow[][] = [];

    for (const root of roots) {
      const chain: SessionRow[] = [];
      let node: SessionRow | undefined = root;

      while (node) {
        chain.push(node);
        node = node.replacedBySessionId
          ? byId.get(node.replacedBySessionId)
          : undefined;
      }

      chains.push(chain);
    }

    return chains;
  }
    /**
   * Detecta anomalia dentro de uma cadeia (ordem cronológica):
   * - danger (prioridade): mudança de país em < 6h
   * - warn: mudança de IP em < 15 min
   *
   * Percorre TODOS os pares antes de retornar. Se qualquer par
   * for danger, retorna danger imediatamente.
   */
  private detectAnomaly(chain: SessionRow[]): {
    level: 'none' | 'warn' | 'danger';
    reason: string | null;
  } {
    if (chain.length < 2) {
      return { level: 'none', reason: null };
    }

    const sorted = [...chain].sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    );

    let worstLevel: 'none' | 'warn' | 'danger' = 'none';
    let worstReason: string | null = null;

    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      const delta = curr.createdAt.getTime() - prev.createdAt.getTime();

      const prevGeo = this.resolveGeo(prev.ipAddress);
      const currGeo = this.resolveGeo(curr.ipAddress);

      // DANGER: país mudou em < 6h — prioridade máxima
      if (
        prevGeo.countryCode &&
        currGeo.countryCode &&
        prevGeo.countryCode !== currGeo.countryCode &&
        delta < COUNTRY_CHANGE_DANGER_MS
      ) {
        return {
          level: 'danger',
          reason: `País mudou de ${prevGeo.countryCode} para ${currGeo.countryCode} em ${Math.round(delta / 60000)} min`,
        };
      }

      // WARN: IP mudou em < 15 min — só registra se ainda não tem nada
      if (
        worstLevel === 'none' &&
        prev.ipAddress &&
        curr.ipAddress &&
        prev.ipAddress !== curr.ipAddress &&
        delta < IP_CHANGE_WARN_MS
      ) {
        worstLevel = 'warn';
        worstReason = `IP mudou de ${prev.ipAddress} para ${curr.ipAddress} em ${Math.round(delta / 60000)} min`;
      }
    }

    return { level: worstLevel, reason: worstReason };
  }

  /**
   * Revoga uma sessão específica de um usuário.
   * Garante que a sessão pertence ao userId informado.
   */
  async revokeOne(
    userId: string,
    sessionId: string,
    reason: string,
  ): Promise<void> {
    const session = await this.prisma.session.findFirst({
      where: { id: sessionId, userId },
      select: { id: true, revokedAt: true },
    });

    if (!session) {
      throw new NotFoundException('Sessão não encontrada');
    }

    if (session.revokedAt) {
      return; // já revogada, idempotente
    }

    await this.prisma.session.update({
      where: { id: sessionId },
      data: { revokedAt: new Date(), revokedReason: reason },
    });

    this.logger.debug(
      `Sessão revogada por admin: user=${userId} session=${sessionId} reason=${reason}`,
    );
  }

  /**
   * Revoga todas as sessões ativas de um usuário.
   */
  async revokeAll(userId: string, reason: string): Promise<number> {
    const result = await this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date(), revokedReason: reason },
    });

    this.logger.debug(
      `Sessões revogadas em lote: user=${userId} count=${result.count} reason=${reason}`,
    );

    return result.count;
  }
}
