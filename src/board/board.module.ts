// ITM-Data-API/src/board/board.module.ts
import { Module } from '@nestjs/common';
import { BoardService } from './board.service';
import { BoardController } from './board.controller';
import { PrismaService } from '../prisma.service';
import { AlertModule } from '../alert/alert.module'; // [추가]

@Module({
  imports: [AlertModule], // [추가] AlertService 주입을 위해 필요
  controllers: [BoardController],
  providers: [BoardService, PrismaService],
})
export class BoardModule {}
