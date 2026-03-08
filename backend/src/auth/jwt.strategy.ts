import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from './auth.service';

/**
 * JWT 策略
 * 用于验证 JWT Token
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      // 从请求头中提取 Token
      // 格式：Authorization: Bearer <token>
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // 忽略过期时间（仅用于演示，生产环境应该设置为 false）
      ignoreExpiration: false,
      // 密钥（实际项目中应该使用环境变量）
      secretOrKey: 'your-secret-key-change-in-production',
    });
  }

  /**
   * 验证 Token 并返回用户信息
   * 这个方法会在 Token 验证成功后自动调用
   */
  async validate(payload: any) {
    const user = await this.authService.validateUser(payload.sub);
    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }
    return user;
  }
}
