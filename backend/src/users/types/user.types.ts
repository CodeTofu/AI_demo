import { User } from '@prisma/client';

/**
 * 用户类型（不包含密码）
 * 用于返回给客户端的数据
 */
export type UserWithoutPassword = Omit<User, 'password'>;
