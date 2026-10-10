import { Controller, Delete, Get, Param, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { SessionsService } from './sessions.service';

@ApiTags('sessions')
@ApiBearerAuth()
@Controller('users/:userId/sessions')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Get()
  @RequirePermissions('iam.users.read')
  list(@Param('userId') userId: string, @Req() request: any) {
    const rawRefresh: string | undefined = request.cookies?.refresh_token;

    // Comparamos hash do cookie atual para marcar "isCurrent".
    // O service só recebe o hash, nunca o token bruto.
    const currentHash = rawRefresh
      ? this.sessionsService.hashToken(rawRefresh)
      : null;

    return this.sessionsService.listForUser(userId, currentHash);
  }

  @Delete(':sessionId')
  @RequirePermissions('iam.users.update')
  revokeOne(
    @Param('userId') userId: string,
    @Param('sessionId') sessionId: string,
  ) {
    return this.sessionsService.revokeOne(userId, sessionId, 'user_revoked');
  }

  @Delete()
  @RequirePermissions('iam.users.update')
  revokeAll(@Param('userId') userId: string) {
    return this.sessionsService.revokeAll(userId, 'user_revoked');
  }
}
