import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

/**
 * 登录 DTO
 */
export class LoginDto {
  @IsEmail({}, { message: '邮箱格式不正确' })
  @IsNotEmpty({ message: '邮箱不能为空' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: '密码不能为空' })
  password: string;
}
