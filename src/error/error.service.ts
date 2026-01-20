// ITM-Data-API/src/error/error.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma } from '@prisma/client';

export class ErrorQueryParams {
  site?: string;
  sdwt?: string;
  eqpId?: string;
  start?: string | Date;
  end?: string | Date;
}

@Injectable()
export class ErrorService {
  private readonly logger = new Logger(ErrorService.name);

  constructor(private prisma: PrismaService) {}

  // [Helper] 날짜 파싱 및 기본값 설정
  private getSafeDates(start?: string | Date, end?: string | Date): { startDate: Date, endDate: Date } {
    const now = new Date();
    
    let startDate = start ? new Date(start) : new Date();
    if (isNaN(startDate.getTime()) || !start) {
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
    }
    startDate.setHours(0, 0, 0, 0);

    let endDate = end ? new Date(end) : now;
    if (isNaN(endDate.getTime())) {
        endDate = now;
    }
    endDate.setHours(23, 59, 59, 999);

    return { startDate, endDate };
  }

  // 1. 에러 요약 정보
  async getErrorSummary(params: ErrorQueryParams) {
    const { site, sdwt, eqpId, start, end } = params;
    const { startDate, endDate } = this.getSafeDates(start, end);

    const whereCondition: Prisma.PlgErrorWhereInput = {
      timeStamp: { gte: startDate, lte: endDate },
    };

    if (eqpId) {
      whereCondition.eqpid = eqpId.trim();
    } else if (site || sdwt) {
      const eqpList = await this.getEqpIdsBySiteSdwt(site, sdwt);
      if (eqpList.length > 0) {
        whereCondition.eqpid = { in: eqpList };
      } else {
        return { 
          totalErrorCount: 0, 
          errorEqpCount: 0,
          topErrorId: '-',
          topErrorCount: 0,
          topErrorLabel: '-',
          errorCountByEqp: [] 
        };
      }
    }

    try {
      const totalErrorCount = await this.prisma.plgError.count({ where: whereCondition });

      const byEqp = await this.prisma.plgError.groupBy({
        by: ['eqpid'],
        where: whereCondition,
        _count: { _all: true },
        orderBy: { _count: { eqpid: 'desc' } },
      });

      const byErrorId = await this.prisma.plgError.groupBy({
        by: ['errorId'],
        where: whereCondition,
        _count: { _all: true },
        orderBy: { _count: { errorId: 'desc' } },
        take: 1,
      });

      let topErrorId = '-';
      let topErrorCount = 0;
      let topErrorLabel = '-';

      if (byErrorId.length > 0) {
        topErrorId = String(byErrorId[0].errorId);
        topErrorCount = byErrorId[0]._count._all;
        
        const errorInfo = await this.prisma.plgError.findFirst({
          where: { errorId: topErrorId },
          select: { errorLabel: true, errorDesc: true },
        });
        if (errorInfo) {
          topErrorLabel = errorInfo.errorLabel || errorInfo.errorDesc || '-';
        }
      }

      const errorCountByEqp = byEqp.slice(0, 10).map(item => ({
        label: item.eqpid,
        value: item._count._all
      }));

      return {
        totalErrorCount,
        errorEqpCount: byEqp.length,
        topErrorId,
        topErrorCount,
        topErrorLabel,
        errorCountByEqp,
      };

    } catch (e) {
      this.logger.error('Error fetching error summary:', e);
      throw e;
    }
  }

  // 2. 에러 트렌드
  async getErrorTrend(params: ErrorQueryParams) {
    const { site, sdwt, eqpId, start, end } = params;
    const { startDate, endDate } = this.getSafeDates(start, end);

    let eqpFilter = '';
    const queryParams: any[] = [startDate, endDate];

    if (eqpId) {
      eqpFilter = `AND e.eqpid = $${queryParams.length + 1}`;
      queryParams.push(eqpId.trim());
    } else if (site || sdwt) {
      const eqpList = await this.getEqpIdsBySiteSdwt(site, sdwt);
      if (eqpList.length > 0) {
          const eqpStr = eqpList.map(id => `'${id}'`).join(',');
          eqpFilter = `AND e.eqpid IN (${eqpStr})`;
      } else {
          return []; 
      }
    }

    const sql = `
      SELECT DATE(e.time_stamp) as date, COUNT(*)::int as count
      FROM public.plg_error e
      WHERE e.time_stamp >= $1 
        AND e.time_stamp <= $2
        ${eqpFilter}
      GROUP BY DATE(e.time_stamp)
      ORDER BY date ASC
    `;

    try {
      const result = await this.prisma.$queryRawUnsafe<any[]>(sql, ...queryParams);
      return result.map(r => ({
        date: typeof r.date === 'string' ? r.date : new Date(r.date).toISOString().split('T')[0],
        count: r.count
      }));
    } catch (e) {
      this.logger.error('Error fetching error trend:', e);
      return [];
    }
  }

  // 3. [수정] 에러 목록 조회 (필드 매핑 강화)
  async getErrorList(params: ErrorQueryParams & { page?: number, pageSize?: number }) {
    const { site, sdwt, eqpId, start, end, page = 0, pageSize = 50 } = params;
    const { startDate, endDate } = this.getSafeDates(start, end);

    const whereCondition: Prisma.PlgErrorWhereInput = {
      timeStamp: { gte: startDate, lte: endDate },
    };

    if (eqpId) {
      whereCondition.eqpid = eqpId.trim();
    } else if (site || sdwt) {
      const eqpList = await this.getEqpIdsBySiteSdwt(site, sdwt);
      if (eqpList.length > 0) {
        whereCondition.eqpid = { in: eqpList };
      } else {
        return { totalItems: 0, items: [] };
      }
    }

    try {
      // 페이지네이션 값 안전 변환
      const take = Number(pageSize) || 50;
      const skip = (Number(page) || 0) * take;

      const [total, items] = await this.prisma.$transaction([
        this.prisma.plgError.count({ where: whereCondition }),
        this.prisma.plgError.findMany({
          where: whereCondition,
          take: take,
          skip: skip,
          orderBy: { timeStamp: 'desc' },
        }),
      ]);

      // [핵심] 프론트엔드 DataTable 필드명과 정확히 일치하도록 매핑
      const mappedItems = items.map((item: any) => ({
        eqpId: item.eqpid,           // Frontend: eqpId
        errorId: item.errorId,       // Frontend: errorId
        errorLabel: item.errorLabel, // Frontend: errorLabel
        errorDesc: item.errorDesc,   // Frontend: errorDesc
        timeStamp: item.timeStamp,   // Frontend: timeStamp
        extraMessage1: item.extraMessage1,
        extraMessage2: item.extraMessage2,
      }));

      return { totalItems: total, items: mappedItems };
    } catch (e) {
      this.logger.error('Error fetching error list:', e);
      throw e;
    }
  }

  private async getEqpIdsBySiteSdwt(site?: string, sdwt?: string): Promise<string[]> {
    if (!site && !sdwt) return [];

    let sql = `
      SELECT t1.eqpid 
      FROM public.ref_equipment t1
      JOIN public.ref_sdwt t2 ON t1.sdwt = t2.sdwt
      WHERE 1=1
    `;
    const params: string[] = [];

    if (site) {
      sql += ` AND t2.site = $${params.length + 1}`;
      params.push(site);
    }
    if (sdwt) {
      sql += ` AND t2.sdwt = $${params.length + 1}`;
      params.push(sdwt);
    }

    try {
      const result = await this.prisma.$queryRawUnsafe<{ eqpid: string }[]>(sql, ...params);
      return result.map(r => r.eqpid);
    } catch (e) {
      this.logger.error('Error fetching equipment IDs:', e);
      return [];
    }
  }
}
