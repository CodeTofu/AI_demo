import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller() // 路由前缀为空，因为已经在 main.ts 设置了全局前缀 'api'
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get() // GET /api
  getHello(): string {
    return this.appService.getHello();
  }
}
