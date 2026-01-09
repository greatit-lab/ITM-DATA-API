// ITM-Data-API/src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  // 로거 인스턴스 생성
  const logger = new Logger('Bootstrap');

  // NestJS 애플리케이션 생성
  const app = await NestFactory.create(AppModule);

  // 1. Global Prefix 설정
  // 모든 API 경로는 '/api'로 시작합니다. (예: http://localhost:8081/api/menu/my)
  app.setGlobalPrefix('api');

  // 2. CORS (Cross-Origin Resource Sharing) 설정
  // 프론트엔드(8082)와 백엔드(8081)의 포트가 다르므로 필수 설정입니다.
  app.enableCors({
    origin: true, // true로 설정 시 요청한 Origin을 그대로 반영 (개발 환경 편의성)
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true, // 쿠키/인증 헤더 전달 허용
  });

  // 3. 포트 설정
  // 환경 변수(PORT)가 없으면 기본값 8081 사용
  const port = process.env.PORT || 8081;

  // 4. 서버 시작
  // '0.0.0.0'을 지정하여 로컬호스트뿐만 아니라 외부 IP(10.135...)로도 접속 가능하게 함
  await app.listen(port, '0.0.0.0');

  logger.log(`🚀 ITM Data API is running on: http://0.0.0.0:${port}/api`);
}

bootstrap().catch((err) => {
  console.error('Fatal Error during bootstrap:', err);
  process.exit(1);
});
