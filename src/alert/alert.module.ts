// ITM-DATA-API/src/alert/alert.module.ts
import { Module } from '@nestjs/common';
import { AlertService } from './alert.service';
import { AlertController } from './alert.controller';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [AlertController],
  providers: [AlertService, PrismaService],
  exports: [AlertService], // BoardModule에서 사용하기 위해 export
})
export class AlertModule {}
