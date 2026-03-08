import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

/**
 * 用户模块
 * 将控制器和服务组织在一起
 * 这是 NestJS 模块化架构的核心
 */
@Module({
  controllers: [UsersController], // 注册控制器
  providers: [UsersService], // 注册服务（提供者）
  exports: [UsersService], // 导出服务，供其他模块使用
})
export class UsersModule {}
