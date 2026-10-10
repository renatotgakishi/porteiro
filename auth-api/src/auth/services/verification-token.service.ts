import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes, createHash } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

export type VerificationTokenType = 'invite' | 'reset';

@Injectable()
export class VerificationTokenService {
  private readonly logger = new Logger(VerificationTokenService.name);
  private readonly defaultTtlHours: number;
  private readonly fallbackStarterKitUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.defaultTtlHours = Number(
      this.config.get<string>('VERIFICATION_TOKEN_TTL_HOURS') ?? 24,
    );
    this.fallbackStarterKitUrl =
      this.config.get<string>('STARTER_IT_URL') ?? 'http://localhost:4001';
  }

  /**
   * Gera um token aleatorio (256 bits) em hex.
   */
  private generateRawToken(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Gera um token, grava no banco e devolve o token CRU
   * (que vai no email).
   *
   * O token bruto NAO e persistido — so o hash SHA-256.
   */
  async create(
    userId: string,
    type: VerificationTokenType,
    ttlHours?: number,
  ): Promise<string> {
    const rawToken = this.generateRawToken();
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');

    const expiresAt = new Date();
    expiresAt.setHours(
      expiresAt.getHours() + (ttlHours ?? this.defaultTtlHours),
    );

    // Remove tokens anteriores do mesmo user + tipo
    // (so pode ter 1 ativo por vez)
    await this.prisma.verificationToken.deleteMany({
      where: {
        identifier: userId,
        type,
      },
    });

    await this.prisma.verificationToken.create({
      data: {
        identifier: userId,
        token: tokenHash,
        type,
        expires: expiresAt,
      },
    });

    this.logger.debug(
      `Token ${type} criado para user=${userId} (expira em ${ttlHours ?? this.defaultTtlHours}h)`,
    );

    return rawToken;
  }

  /**
   * Valida o token cru. Devolve os dados se for valido e nao expirado.
   * Devolve null se nao existir ou estiver expirado (e apaga se expirado).
   */
  async validate(
    rawToken: string,
    type: VerificationTokenType,
  ): Promise<{ userId: string } | null> {
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');

    const record = await this.prisma.verificationToken.findUnique({
      where: { token: tokenHash },
    });

    if (!record) {
      return null;
    }

    if (record.type !== type) {
      return null;
    }

    if (record.expires < new Date()) {
      // expirado: apaga e devolve null
      await this.prisma.verificationToken.delete({
        where: { id: record.id },
      });
      return null;
    }

    return { userId: record.identifier };
  }

  /**
   * Consome o token (apaga depois do uso).
   */
  async consume(rawToken: string): Promise<void> {
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');

    await this.prisma.verificationToken.deleteMany({
      where: { token: tokenHash },
    });
  }

  /**
   * Monta a URL do starter-kit pra enviar no email.
   * Usa o starterKitUrl do tenant, ou o fallback do .env.
   */
  async buildSetPasswordUrl(
    userId: string,
    rawToken: string,
  ): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        tenant: {
          select: { starterKitUrl: true },
        },
      },
    });

    const baseUrl =
      user?.tenant?.starterKitUrl ?? this.fallbackStarterKitUrl;

    //return `${baseUrl}/auth/set-password?token=${rawToken}`;
    return `${baseUrl}/set-password?token=${rawToken}`;
  }
}