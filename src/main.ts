// ITM-Data-API/src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 1. API Global Prefix 설정
  // 호출 주소: http://localhost:8081/api/...
  app.setGlobalPrefix('api');

  // 2. CORS 허용 (프론트엔드에서의 접근 허용)
  app.enableCors({
    origin: true, // 보안 강화 시 프론트엔드 도메인/IP로 지정 권장
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // 3. 8081 포트 사용 (기존 5432 직접 접근 대체용)
  const port = 8081;
  await app.listen(port);

  console.log(`🚀 ITM Data API is running on: http://localhost:${port}/api`);
}
bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
