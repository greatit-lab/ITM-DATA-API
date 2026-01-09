// ITM-Data-API/src/prealign/prealign.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class PreAlignService {
  constructor(private prisma: PrismaService) {}

  async getLog(eqpId: string, startDate: string, endDate: string) {
    // [수정] logPreAlign -> plgPreAlign (Prisma Schema 모델명 기준)
    return this.prisma.plgPreAlign.findMany({
      where: {
        eqpid: eqpId,
        servTs: { // [수정] timestamp -> servTs (스키마 기준)
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
      orderBy: { servTs: 'asc' }, // [수정] timestamp -> servTs
      select: {
        servTs: true, // [수정] timestamp -> servTs
        xmm: true,
        ymm: true,
        notch: true,
      },
    });
  }
}
