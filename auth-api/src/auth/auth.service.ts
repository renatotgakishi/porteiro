import { VerificationTokenService } from './services/verification-token.service';
import { MailService } from '../mail/mail.service';
import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { PermissionsResolverService } from './services/permissions-resolver.service';
import { SessionsService } from './services/sessions.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly permissionsResolver: PermissionsResolverService,
    private readonly sessionsService: SessionsService,
    private readonly verificationTokens: VerificationTokenService,
    private readonly mailService: MailService,
  ) {}

  async register(dto: RegisterDto) {
    const tenant = await this.prisma.tenant.findFirst({
      where: {
        id: dto.tenantId,
        deleted: false,
      },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant não encontrado');
    }

    const existingUser = await this.prisma.user.findUnique({
      where: {
        tenantId_email: {
          tenantId: dto.tenantId,
          email: dto.email,
        },
      },
    });

    if (existingUser && !existingUser.deleted) {
      throw new ConflictException('Email já cadastrado neste tenant');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          tenantId: dto.tenantId,
          name: dto.name,
          email: dto.email,
          password: passwordHash,
          userId: 'BOOTSTRAP',
        },
      });

      let role = await tx.role.findFirst({
        where: {
          tenantId: dto.tenantId,
          name: 'user',
          deleted: false,
        },
      });

      if (!role) {
        role = await tx.role.create({
          data: {
            tenantId: dto.tenantId,
            name: 'user',
            userId: newUser.id,
          },
        });
      }

      await tx.userRole.create({
        data: {
          userId: newUser.id,
          roleId: role.id,
        },
      });

      return newUser;
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      tenantId: user.tenantId,
    };
  }

  async login(
    dto: LoginDto,
    userAgent?: string | null,
    ipAddress?: string | null,
  ) {
    // Busca global por email. A regra "email único global" é garantida
    // no UsersService (create/update). Aqui, se achar mais de um,
    // é sinal de dado inconsistente — melhor falhar do que logar no
    // tenant errado.
    const candidates = await this.prisma.user.findMany({
      where: { email: dto.email, deleted: false },
    });

    if (candidates.length === 0) {
      throw new UnauthorizedException('Email ou senha inválidos');
    }

    if (candidates.length > 1) {
      // Defensivo. Nunca deveria acontecer se a regra do service
      // estiver aplicada. Falha explícita pra não logar no tenant errado.
      throw new InternalServerErrorException(
        'Ambiguidade: email duplicado em tenants diferentes',
      );
    }

    const user = candidates[0];

    if (user.tenantId) {
      const tenant = await this.prisma.tenant.findFirst({
        where: { id: user.tenantId, deleted: false },
      });

      if (!tenant) {
        throw new UnauthorizedException('Empresa não encontrada');
      }

      if (tenant.licenseExpiresAt < new Date()) {
        throw new UnauthorizedException('Licença da empresa expirada');
      }
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.password);

    if (!passwordMatches) {
      throw new UnauthorizedException('Email ou senha inválidos');
    }

    const payload = {
      sub: user.id,
      tenantId: user.tenantId,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    const { rawToken: refreshToken } = await this.sessionsService.createSession(
      user.id,
      userAgent,
      ipAddress,
    );

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const permissions = await this.permissionsResolver.resolve(user.id);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        tenantId: user.tenantId,
      },
      permissions,
    };
  }
  async logout(userId: string, refreshToken?: string): Promise<void> {
    if (refreshToken) {
      const session =
        await this.sessionsService.findActiveByRawToken(refreshToken);

      if (session) {
        await this.sessionsService.revoke(session.id, 'logout');
        return;
      }
    }

    await this.sessionsService.revokeAllForUser(userId, 'logout');
  }

  async validateTokenPayload(payload: {
    sub: string;
    tenantId: string | null;
  }) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: payload.sub,
      },
      select: {
        id: true,
        name: true,
        email: true,
        tenantId: true,
        deleted: true,
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!user || user.deleted) {
      throw new UnauthorizedException('Usuário não encontrado');
    }

    const { deleted: _deleted, ...safeUser } = user;
    return safeUser;
  }

  async refresh(
    refreshToken: string,
    userAgent?: string | null,
    ipAddress?: string | null,
  ) {
    const session =
      await this.sessionsService.findByRawTokenIncludingRevoked(refreshToken);

    if (!session) {
      throw new UnauthorizedException('Refresh token inválido');
    }

    if (session.revokedAt && session.revokedReason === 'rotated') {
      await this.sessionsService.revokeChain(session.id);
      throw new UnauthorizedException('Refresh token reutilizado');
    }

    if (session.revokedAt) {
      throw new UnauthorizedException('Refresh token revogado');
    }

    if (session.expiresAt < new Date()) {
      await this.sessionsService.revoke(session.id, 'expired');
      throw new UnauthorizedException('Refresh token expirado');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        tenantId: true,
        deleted: true,
      },
    });

    if (!user || user.deleted) {
      throw new UnauthorizedException('Usuário não encontrado');
    }

    const { rawToken: newRefreshToken } = await this.sessionsService.rotate(
      session.id,
      user.id,
      userAgent,
      ipAddress,
    );

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      tenantId: user.tenantId,
    });

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  async getUserPermissions(userId: string): Promise<string[]> {
    return this.permissionsResolver.resolve(userId);
  }
  async forgotPassword(email: string): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: { email, deleted: false },
    });

    // Nao revela se o email existe ou nao (seguranca).
    // Se nao achar, apenas retorna sem erro.
    if (!user) {
      return;
    }

    const rawToken = await this.verificationTokens.create(user.id, 'reset');

    const url = await this.verificationTokens.buildSetPasswordUrl(
      user.id,
      rawToken,
    );

    await this.mailService.send({
      to: user.email,
      subject: 'Redefinir senha',
      text: [
        `Ola ${user.name ?? user.email},`,
        '',
        'Recebemos um pedido para redefinir sua senha.',
        'Acesse o link abaixo para criar uma nova senha:',
        '',
        url,
        '',
        'Se voce nao pediu isso, ignore este email.',
      ].join('\n'),
    });
  }

  async setPassword(token: string, newPassword: string): Promise<void> {
    const result = await this.verificationTokens.validate(token, 'reset');

    // Aceita tanto reset quanto invite (mesmo endpoint)
    const resultInvite = result
      ? null
      : await this.verificationTokens.validate(token, 'invite');

    const final = result ?? resultInvite;

    if (!final) {
      throw new UnauthorizedException('Token invalido ou expirado');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: final.userId },
      data: { password: passwordHash },
    });

    await this.verificationTokens.consume(token);

    // Revoga todas as sessoes do user (troca de senha)
    await this.sessionsService.revokeAllForUser(final.userId, 'admin_revoked');
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.deleted) {
      throw new UnauthorizedException('Usuario nao encontrado');
    }

    const matches = await bcrypt.compare(currentPassword, user.password);

    if (!matches) {
      throw new UnauthorizedException('Senha atual incorreta');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: passwordHash },
    });

    // Revoga todas as sessoes (seguranca — troca de senha)
    await this.sessionsService.revokeAllForUser(userId, 'admin_revoked');
  }
}
