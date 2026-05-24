import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { AiModule } from './ai/ai.module';
import { HoldingsModule } from './holdings/holdings.module';
import { RealtimeModule } from './realtime/realtime.module';
import { KnowledgeModule } from './knowledge/knowledge.module';

@Module({
  imports: [
    PrismaModule,
    UsersModule,
    AuthModule,
    AiModule,
    HoldingsModule,
    RealtimeModule,
    KnowledgeModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
