/**
 * 用户实体类
 * 定义用户的数据结构
 */
export class User {
  id: number;
  name: string;
  email: string;
  password: string; // 密码（加密后存储）
  createdAt: Date;

  constructor(id: number, name: string, email: string, password: string) {
    this.id = id;
    this.name = name;
    this.email = email;
    this.password = password;
    this.createdAt = new Date();
  }

  // 返回用户信息时，不包含密码
  toJSON() {
    const { password, ...user } = this;
    return user;
  }
}
