// ITM-Data-API/src/performance/performance.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma } from '@prisma/client';
// [수정] import * as dayjs -> import dayjs (Default Import 사용)
import dayjs from 'dayjs';
// [수정] import * as utc -> import utc (Default Import 사용)
import utc from 'dayjs/plugin/utc';

// [핵심] UTC 플러그인 활성화
dayjs.extend(utc);

@Injectable()
export class PerformanceService {
  constructor(private prisma: PrismaService) {}

  /**
   * [핵심 유틸] 날짜 문자열을 UTC Date 객체로 변환
   * 예: "2026-01-28 14:00:00" -> 2026-01-28T14:00:00.000Z
   * 이렇게 해야 Prisma가 DB에 쿼리를 날릴 때 "14:00:00" 시간을 그대로 유지함.
   */
  private parseDate(dateStr: string): Date {
    // 로컬 시간대 변환 없이, 입력된 문자열 그대로를 UTC 시간으로 해석
    return dayjs.utc(dateStr).toDate();
  }

  // 1. 장비 성능 이력 조회
  async getPerformanceHistory(
    startDate: string,
    endDate: string,
    eqpids?: string,
  ) {
    const where: Prisma.EqpPerfWhereInput = {
      servTs: {
        gte: this.parseDate(startDate), // [수정] UTC 강제 변환 유틸 사용
        lte: this.parseDate(endDate),   // [수정] UTC 강제 변환 유틸 사용
      },
    };

    if (eqpids) {
      const eqpIdList = eqpids.split(',');
      where.eqpid = { in: eqpIdList };
    }

    const results = await this.prisma.eqpPerf.findMany({
      where,
      orderBy: { servTs: 'asc' },
    });

    return results.map((row) => ({
      eqpId: row.eqpid,
      timestamp: row.servTs,
      cpuUsage: row.cpuUsage,
      memoryUsage: row.memUsage,
      cpuTemp: row.cpuTemp,
      gpuTemp: row.gpuTemp,
      fanSpeed: row.fanSpeed,
    }));
  }

  // 2. 프로세스별 메모리 이력 조회
  async getProcessHistory(
    startDate: string,
    endDate: string,
    eqpId: string,
    interval: number = 60,
  ) {
    const results = await this.prisma.eqpProcPerf.findMany({
      where: {
        eqpid: eqpId,
        servTs: {
          gte: this.parseDate(startDate), // [수정] UTC 강제 변환 유틸 사용
          lte: this.parseDate(endDate),   // [수정] UTC 강제 변환 유틸 사용
        },
      },
      orderBy: { servTs: 'asc' },
    });

    return results.map((row: any) => ({
      timestamp: row.servTs,
      processName: row.processName,
      memoryUsageMB: row.memoryUsageMb ?? row.memoryUsageMB ?? 0,
    }));
  }

  // 3. ITM Agent 프로세스 트렌드 조회
  async getItmAgentTrend(
    site: string,
    sdwt: string,
    startDate: string,
    endDate: string,
    eqpid?: string,
    interval: number = 60,
  ) {
    const start = this.parseDate(startDate); // [수정] UTC 강제 변환 유틸 사용
    const end = this.parseDate(endDate);     // [수정] UTC 강제 변환 유틸 사용

    let filterSql = Prisma.sql`
      WHERE p.process_name LIKE '%Agent%' 
        AND p.serv_ts >= ${start} 
        AND p.serv_ts <= ${end}
    `;

    if (eqpid) {
      filterSql = Prisma.sql`${filterSql} AND p.eqpid = ${eqpid}`;
    }

    if (sdwt) {
      filterSql = Prisma.sql`${filterSql} AND r.sdwt = ${sdwt}`;
    } else if (site) {
      filterSql = Prisma.sql`${filterSql} AND r.sdwt IN (SELECT sdwt FROM public.ref_sdwt WHERE site = ${site})`;
    }

    const results = await this.prisma.$queryRaw`
      SELECT 
        to_timestamp(floor(extract(epoch from p.serv_ts) / ${interval}) * ${interval}) as timestamp,
        p.eqpid as "eqpId",
        MAX(p.memory_usage_mb) as "memoryUsageMB",
        MAX(i.app_ver) as "agentVersion"
      FROM public.eqp_proc_perf p
      JOIN public.ref_equipment r ON p.eqpid = r.eqpid
      LEFT JOIN public.agent_info i ON r.eqpid = i.eqpid
      ${filterSql}
      GROUP BY 1, 2
      ORDER BY 1 ASC
    `;

    return results;
  }
}
