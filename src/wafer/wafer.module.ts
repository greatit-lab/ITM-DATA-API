// ITM-Data-API/src/wafer/wafer.module.ts
import { Module } from '@nestjs/common';
import { WaferController } from './wafer.controller';
import { WaferService } from './wafer.service';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [WaferController],
  providers: [WaferService, PrismaService],
})
export class WaferModule {}
