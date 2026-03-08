import { Injectable } from '@nestjs/common';

@Injectable() // 装饰器，表示这是一个可注入的服务
export class AppService {
  getHello(): string {
    return '欢迎使用 NestJS 后端服务！';
  }
}
