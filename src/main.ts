// [전체 코드 교체] ITM-Data-API/src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  // 로거 인스턴스 생성
  const logger = new Logger('Bootstrap');

  // NestJS 애플리케이션 생성
  const app = await NestFactory.create(AppModule);

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

  // 4. 서버 시작
  await app.listen(port, '0.0.0.0');

  logger.log(`🚀 ITM Data API is running on: http://0.0.0.0:${port}/api`);
  logger.log(`✅ Server started successfully. Ready to accept requests.`);
}

bootstrap().catch((err) => {
  console.error('Fatal Error during bootstrap:', err);
  process.exit(1);
});
