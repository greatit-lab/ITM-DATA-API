// ITM-Data-API/src/lamplife/lamplife.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class LampLifeService {
  constructor(private prisma: PrismaService) {}

  // 1. 램프 데이터 조회
  async getLampData(site?: string, sdwt?: string, eqpId?: string) {
    const where: Prisma.EqpLampLifeWhereInput = {};

    // 장비 필터링 조건 생성 (Site, SDWT)
    if (site || sdwt || eqpId) {
      where.equipment = {
        sdwtRel: {
          isUse: 'Y',
          ...(site ? { site } : {}),
        },
        ...(sdwt ? { sdwt } : {}),
        ...(eqpId ? { eqpid: eqpId } : {}),
      };
    }

    return this.prisma.eqpLampLife.findMany({
      where,
      orderBy: { servTs: 'desc' },
      include: {
        equipment: {
          select: {
            eqpid: true,
            model: true,
            sdwtRel: {
              select: {
                site: true,
                sdwt: true,
              },
            },
          },
        },
      },
    });
  }

  // 2. 램프 교체 이력 등록 (옵션)
  async addLampHistory(data: Prisma.EqpLampLifeCreateInput) {
    return this.prisma.eqpLampLife.create({
      data,
    });
  }
}
