// ITM-Data-API/src/filters/filters.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class FiltersService {
  constructor(private prisma: PrismaService) {}

  // 1. Site 목록 조회 (RefSdwt 테이블 기준)
  async getSites() {
    // [수정] site는 필수 컬럼이므로 { not: null } 체크 제거
    const results = await this.prisma.refSdwt.findMany({
      select: { site: true },
      where: { 
        isUse: 'Y' // 사용 여부만 체크
      },
      distinct: ['site'], // DISTINCT site
      orderBy: { site: 'asc' },
    });

    // 객체 배열 -> 문자열 배열 변환
    return results.map((r) => r.site);
  }

  // 2. SDWT 목록 조회 (RefSdwt 테이블 기준)
  async getSdwts(site?: string) {
    // [수정] sdwt는 필수 컬럼이므로 { not: null } 체크 제거
    const where: Prisma.RefSdwtWhereInput = { 
      isUse: 'Y' 
    };
    
    // Site가 선택된 경우 해당 Site에 속한 SDWT만 조회
    if (site) {
      where.site = site;
    }

    const results = await this.prisma.refSdwt.findMany({
      select: { sdwt: true },
      where: where,
      distinct: ['sdwt'], // DISTINCT sdwt
      orderBy: { sdwt: 'asc' },
    });

    return results.map((r) => r.sdwt);
  }
}
