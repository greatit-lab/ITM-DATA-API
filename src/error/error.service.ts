// ITM-Data-API/src/error/error.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
// [수정] 사용하지 않는 'Prisma' import 제거

@Injectable()
export class ErrorService {
  constructor(private prisma: PrismaService) {}

  // where 조건 생성 헬퍼
  private getWhereInput(site: string, sdwt: string, start: string, end: string) {
    return {
      timeStamp: { gte: new Date(start), lte: new Date(end) },
      // 추후 site, sdwt 관련 필터가 필요하면 여기에 추가
    };
  }

  async getErrorSummary(site: string, sdwt: string, start: string, end: string) {
    const where = this.getWhereInput(site, sdwt, start, end);
    
    // 1. 전체 에러 개수
    const totalCount = await this.prisma.plgError.count({ where });

    // 2. Top Error 집계
    const groupByError = await this.prisma.plgError.groupBy({
      by: ['errorId'],
      where,
      _count: { errorId: true },
      orderBy: { _count: { errorId: 'desc' } },
      take: 1,
    });
    
    // 결과 접근 (Optional Chaining)
    const topItem = groupByError[0];
    const topErrorCount = topItem?._count?.errorId ?? 0;

    return {
        totalErrorCount: totalCount,
        errorEqpCount: 0, 
        topErrorId: topItem?.errorId || '-',
        topErrorCount: topErrorCount,
        topErrorLabel: 'Unknown',
        errorCountByEqp: []
    };
  }

  async getErrorTrend(site: string, sdwt: string, start: string, end: string) {
    // Raw Query 컬럼명 "time_stamp" 주의
    return this.prisma.$queryRaw`
      SELECT DATE("time_stamp") as date, COUNT(*) as count
      FROM "plg_error"
      WHERE "time_stamp" >= ${new Date(start)} AND "time_stamp" <= ${new Date(end)}
      GROUP BY DATE("time_stamp")
      ORDER BY date ASC
    `;
  }

  async getErrorLogs(page: number, limit: number, site: string, sdwt: string, start: string, end: string) {
    const where = this.getWhereInput(site, sdwt, start, end);
    const skip = (page - 1) * limit;

    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.plgError.findMany({
        where,
        skip,
        take: limit,
        orderBy: { timeStamp: 'desc' },
      }),
      this.prisma.plgError.count({ where }),
    ]);

    return { items, totalItems };
  }
}
