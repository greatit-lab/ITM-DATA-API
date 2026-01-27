// ITM-Data-API/src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { json, urlencoded } from 'express'; // [추가] express 모듈

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // NestJS 애플리케이션 생성 (HTTPS 옵션 제거 -> HTTP 모드)
  const app = await NestFactory.create(AppModule);

  // [추가] 요청 본문(Body) 크기 제한을 50MB로 증가 (이미지 붙여넣기 대응)
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));

  // 1. Global Prefix 설정
  app.setGlobalPrefix('api');

  // 2. CORS 설정
  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // 3. 포트 설정
  const port = process.env.PORT || 8081;

  // 4. 서버 시작 (HTTP)
  await app.listen(port, '0.0.0.0');

  logger.log(`🚀 ITM Data API is running on: http://0.0.0.0:${port}/api`);
}

bootstrap().catch((err) => {
  console.error('Fatal Error during bootstrap:', err);
  process.exit(1);
});
