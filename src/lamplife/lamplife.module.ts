// ITM-DATA-API/src/lamplife/lamplife.module.ts
import { Module } from '@nestjs/common';
import { LampLifeController } from './lamplife.controller';
import { LampLifeService } from './lamplife.service';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [LampLifeController],
  providers: [LampLifeService, PrismaService],
})
export class LampLifeModule {}
