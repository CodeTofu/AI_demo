import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

/**
 * 认证服务
 * 处理登录、注册、JWT 生成等认证相关逻辑
 */
@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  /**
   * 用户注册
   */
  async register(registerDto: RegisterDto) {
    // 检查邮箱是否已存在
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new ConflictException('该邮箱已被注册');
    }

    // 加密密码
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(registerDto.password, saltRounds);

    // 创建用户
    const user = await this.usersService.create(registerDto, hashedPassword);

    // 生成 JWT Token
    const payload = { sub: user.id, email: user.email };
    const access_token = this.jwtService.sign(payload);

    // 返回用户信息（不包含密码）和 Token
    return {
      access_token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    };
  }

  /**
   * 用户登录
   */
  async login(loginDto: LoginDto) {
    // 查找用户
    const user = await this.usersService.findByEmail(loginDto.email);
    if (!user) {
      throw new UnauthorizedException('邮箱或密码错误');
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('邮箱或密码错误');
    }

    // 生成 JWT Token
    const payload = { sub: user.id, email: user.email };
    const access_token = this.jwtService.sign(payload);

    // 返回用户信息（不包含密码）和 Token
    return {
      access_token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    };
  }

  /**
   * 根据用户 ID 获取用户信息（用于 JWT 验证后）
   */
  async validateUser(userId: number) {
    const user = await this.usersService.findOne(userId);
    if (!user) {
      return null;
    }
    // 返回用户信息，不包含密码
    return {
      id: user.id,
      name: user.name,
      email: user.email,
    };
  }
}
