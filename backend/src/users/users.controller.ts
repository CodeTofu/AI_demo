import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service';
import { CreateUserAdminDto } from './dto/create-user-admin.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

/**
 * 用户控制器
 * 处理所有与用户相关的 HTTP 请求
 * @Controller('users') 表示路由前缀为 /users
 * 完整路径: /api/users (因为 main.ts 设置了全局前缀 'api')
 */
@Controller('users')
export class UsersController {
  // 依赖注入：NestJS 会自动创建 UsersService 实例并注入
  constructor(private readonly usersService: UsersService) {}

  /**
   * GET /api/users
   * 获取所有用户
   * @UseGuards(JwtAuthGuard) 表示此接口需要认证
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll() {
    return this.usersService.findAll();
  }

  /**
   * GET /api/users/:id
   * 根据 ID 获取单个用户
   * @Param('id', ParseIntPipe) 自动将路径参数转换为数字
   */
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const user = await this.usersService.findOne(id);
    if (!user) {
      return { message: '用户不存在', statusCode: 404 };
    }
    return user;
  }

  /**
   * POST /api/users
   * 创建新用户（管理员功能）
   * 注意：此接口主要用于演示，实际项目中用户应该通过注册接口创建
   * @Body() 自动解析请求体，并验证 CreateUserAdminDto
   */
  @Post()
  @UseGuards(JwtAuthGuard) // 需要认证
  @HttpCode(HttpStatus.CREATED) // 返回 201 状态码
  async create(@Body() createUserDto: CreateUserAdminDto) {
    // 如果没有提供密码，使用默认密码
    const password = createUserDto.password || '123456';
    // 加密密码
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    // 创建用户（需要转换为 CreateUserDto 格式）
    const userDto: CreateUserDto = {
      name: createUserDto.name,
      email: createUserDto.email,
      password: password, // 仅用于传递，实际存储的是加密后的
    };
    const user = await this.usersService.create(userDto, hashedPassword);
    // 返回用户信息（不包含密码）
    // Prisma 返回的用户已经排除了 password 字段（在 service 中已设置 select）
    return user;
  }

  /**
   * PATCH /api/users/:id
   * 更新用户信息
   */
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: Partial<CreateUserDto>,
  ) {
    const user = await this.usersService.update(id, updateUserDto);
    if (!user) {
      return { message: '用户不存在', statusCode: 404 };
    }
    return user;
  }

  /**
   * DELETE /api/users/:id
   * 删除用户
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT) // 返回 204 状态码
  async remove(@Param('id', ParseIntPipe) id: number) {
    const success = await this.usersService.remove(id);
    if (!success) {
      return { message: '用户不存在', statusCode: 404 };
    }
    return;
  }
}
