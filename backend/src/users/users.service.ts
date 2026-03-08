import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { User } from '@prisma/client'; // 使用 Prisma 生成的类型
import { UserWithoutPassword } from './types/user.types';

/**
 * 用户服务类
 * 包含所有用户相关的业务逻辑
 * 使用 Prisma 进行数据库操作
 */
@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  /**
   * 获取所有用户
   */
  async findAll(): Promise<UserWithoutPassword[]> {
    return this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        updatedAt: true,
        // 不返回 password 字段
      },
    });
  }

  /**
   * 根据 ID 查找用户
   */
  async findOne(id: number): Promise<UserWithoutPassword | null> {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        updatedAt: true,
        // 不返回 password 字段
      },
    });
  }

  /**
   * 根据邮箱查找用户（用于登录）
   * 注意：这个方法需要返回密码，用于验证登录
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
      // 登录时需要密码，所以这里返回完整用户信息
    });
  }

  /**
   * 创建新用户
   * 注意：密码应该在调用此方法前已经加密
   */
  async create(createUserDto: CreateUserDto, hashedPassword: string): Promise<UserWithoutPassword> {
    return this.prisma.user.create({
      data: {
        name: createUserDto.name,
        email: createUserDto.email,
        password: hashedPassword, // 存储加密后的密码
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        updatedAt: true,
        // 不返回 password 字段
      },
    });
  }

  /**
   * 更新用户信息
   */
  async update(id: number, updateData: Partial<CreateUserDto>): Promise<UserWithoutPassword | null> {
    try {
      return await this.prisma.user.update({
        where: { id },
        data: {
          ...(updateData.name && { name: updateData.name }),
          ...(updateData.email && { email: updateData.email }),
        },
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
          updatedAt: true,
          // 不返回 password 字段
        },
      });
    } catch (error) {
      // 如果用户不存在，Prisma 会抛出异常
      return null;
    }
  }

  /**
   * 删除用户
   */
  async remove(id: number): Promise<boolean> {
    try {
      await this.prisma.user.delete({
        where: { id },
      });
      return true;
    } catch (error) {
      // 如果用户不存在，Prisma 会抛出异常
      return false;
    }
  }
}
