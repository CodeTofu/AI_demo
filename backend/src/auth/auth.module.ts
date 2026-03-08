import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { JwtStrategy } from './jwt.strategy';

/**
 * 认证模块         
 */
@Module({
  imports: [
    UsersModule, // 导入用户模块，以便使用 UsersService
    PassportModule, // Passport 模块
    JwtModule.register({
      // JWT 配置
      secret: 'your-secret-key-change-in-production', // 密钥（实际项目中应该使用环境变量）
      signOptions: { expiresIn: '7d' }, // Token 过期时间：7天
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy], // 注册服务和策略
  exports: [AuthService], // 导出服务，供其他模块使用
})
export class AuthModule {}
