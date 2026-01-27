// ITM-DATA-API/src/alert/alert.module.ts
import { Module } from '@nestjs/common';
import { AlertService } from './alert.service';
import { AlertController } from './alert.controller';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [AlertController],
  providers: [AlertService, PrismaService],
  exports: [AlertService], // 다른 모듈(Board 등)에서 알림 생성 시 사용
})
export class AlertModule {}
