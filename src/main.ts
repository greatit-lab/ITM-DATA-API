// itm-data-api/src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();

  // [수정] 8080 -> 8081로 변경
  await app.listen(8081);
  console.log(`Data API Server running on port 8081`);
}
void bootstrap();
