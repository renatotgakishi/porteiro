import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { UserRolesController } from './user-roles.controller';
import { UserRolesService } from './user-roles.service';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
  ],
  controllers: [UserRolesController],
  providers: [UserRolesService],
  exports: [UserRolesService],
})
export class UserRolesModule {}