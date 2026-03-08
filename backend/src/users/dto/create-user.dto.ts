import { IsString, IsEmail, IsNotEmpty, MinLength } from 'class-validator';

/**
 * 创建用户的 DTO (Data Transfer Object)
 * DTO 用于定义数据传输的格式和验证规则
 */
export class CreateUserDto {
  @IsString() // 验证：必须是字符串
  @IsNotEmpty({ message: '姓名不能为空' }) // 验证：不能为空
  name: string;

  @IsEmail({}, { message: '邮箱格式不正确' }) // 验证：必须是有效的邮箱格式
  @IsNotEmpty({ message: '邮箱不能为空' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: '密码不能为空' })
  @MinLength(6, { message: '密码长度至少为6位' })
  password: string;
}
