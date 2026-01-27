// ITM-Data-API/src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { json, urlencoded } from 'express';
import { DateTransformInterceptor } from './common/interceptors/date-transform.interceptor';
import { DateInputPipe } from './common/pipes/date-input.pipe';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // [핵심 수정] process.env.TZ 설정 삭제함

  const app = await NestFactory.create(AppModule, {
    bodyParser: false, 
  });

  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));

  app.setGlobalPrefix('api');

  app.useGlobalPipes(new DateInputPipe());
  app.useGlobalInterceptors(new DateTransformInterceptor());

  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  const port = process.env.PORT || 8081;
  await app.listen(port, '0.0.0.0');

  logger.log(`🚀 ITM Data API is running on: http://0.0.0.0:${port}/api`);
}

bootstrap().catch((err) => {
  console.error('Fatal Error during bootstrap:', err);
  process.exit(1);
});
