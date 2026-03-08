import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * Prisma 模块
 * 使用 @Global() 装饰器，使其成为全局模块
 * 这样其他模块就可以直接使用 PrismaService，无需导入
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService], // 导出服务，供其他模块使用
})
export class PrismaModule {}
