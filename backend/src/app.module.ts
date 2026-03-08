import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { AiModule } from './ai/ai.module';

@Module({
  imports: [PrismaModule, UsersModule, AuthModule, AiModule], // 导入 Prisma 模块、用户模块、认证模块和 AI 模块
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
