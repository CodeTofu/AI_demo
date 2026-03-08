import { IsString, IsEmail, IsNotEmpty, IsOptional } from 'class-validator';

/**
 * 管理员创建用户的 DTO
 * 用于管理员创建用户，密码可选（如果不提供，使用默认密码）
 */
export class CreateUserAdminDto {
  @IsString()
  @IsNotEmpty({ message: '姓名不能为空' })
  name: string;

  @IsEmail({}, { message: '邮箱格式不正确' })
  @IsNotEmpty({ message: '邮箱不能为空' })
  email: string;

  @IsString()
  @IsOptional() // 密码可选
  password?: string;
}
