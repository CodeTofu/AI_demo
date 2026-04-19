import { config } from 'dotenv';

// 最先加载 .env，保证 process.env 在应用启动前可用
config({ path: '.env' });

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { AppModule } from './app.module';

async function bootstrap() {
  console.log('Nest bootstrap starting...');
  const app = await NestFactory.create(AppModule);

  app.useWebSocketAdapter(new IoAdapter(app));

  // 启用 CORS，允许前端访问
  app.enableCors({
    origin: 'http://localhost:3000', // 前端地址
    credentials: true,
  });

  // 全局验证管道，自动验证请求数据
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // 自动过滤掉未定义的属性
      transform: true, // 自动转换类型
    }),
  );

  // 设置全局前缀
  app.setGlobalPrefix('api');

  const port = 3001;
  await app.listen(port);
  console.log(`🚀 后端服务运行在: http://localhost:${port}`);
  console.log(`📡 API 地址: http://localhost:${port}/api`);
  console.log(
    `🔌 WebSocket(SIO) 命名空间: ws://localhost:${port}/realtime （鉴权：handshake.auth.token）`,
  );
}

bootstrap().catch((err) => {
  console.error('Nest bootstrap failed:', err);
  process.exit(1);
});
