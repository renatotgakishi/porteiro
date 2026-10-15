import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';

import { ThemesService } from './themes.service';
import { ThemesController } from './themes.controller';

@Module({
  imports: [
    AuthModule,
    PrismaModule,
  ],
  controllers: [ThemesController],
  providers: [ThemesService],
  exports: [ThemesService],
})
export class ThemesModule {}