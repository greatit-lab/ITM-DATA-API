// ITM-Data-API/src/infra/infra.module.ts
import { Module } from '@nestjs/common';
import { InfraController } from './infra.controller';
import { InfraService } from './infra.service';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [InfraController],
  providers: [InfraService, PrismaService],
})
export class InfraModule {}
