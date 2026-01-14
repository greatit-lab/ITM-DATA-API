// ITM-Data-API/src/performance/performance.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class PerformanceService {
  constructor(private prisma: PrismaService) {}

  // 1. 장비 성능 이력 조회 (CPU, Memory, Temp 등)
  async getPerformanceHistory(startDate: string, endDate: string, eqpids?: string) {
    const where: Prisma.EqpPerfWhereInput = {
      servTs: {
        gte: new Date(startDate),
        lte: new Date(endDate),
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

  // 2. 프로세스별 메모리 이력 조회 (Process Memory View)
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
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
      orderBy: { servTs: 'asc' },
    });

    // [핵심 수정] DB 필드명(Prisma)을 Frontend DTO 형식으로 매핑
    // servTs -> timestamp
    // memoryUsageMb -> memoryUsageMB
    return results.map((row: any) => ({
      timestamp: row.servTs,
      processName: row.processName,
      // Prisma는 스네이크케이스(memory_usage_mb)를 주로 카멜케이스(memoryUsageMb)로 매핑함
      memoryUsageMB: row.memoryUsageMb ?? row.memoryUsageMB ?? 0, 
    }));
  }

  // 3. ITM Agent 프로세스 트렌드 조회 (전체 장비 비교)
  async getItmAgentTrend(site: string, sdwt: string, startDate: string, endDate: string) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    let filterSql = Prisma.sql`
      WHERE p.process_name LIKE '%Agent%' 
        AND p.serv_ts >= ${start} 
        AND p.serv_ts <= ${end}
    `;

    if (sdwt) {
      filterSql = Prisma.sql`${filterSql} AND r.sdwt = ${sdwt}`;
    } else if (site) {
      filterSql = Prisma.sql`${filterSql} AND r.sdwt IN (SELECT sdwt FROM public.ref_sdwt WHERE site = ${site})`;
    }

    const results = await this.prisma.$queryRaw`
      SELECT 
        p.serv_ts as timestamp,
        p.eqpid as "processName",
        p.memory_usage_mb as "memoryUsageMB"
      FROM public.eqp_proc_perf p
      JOIN public.ref_equipment r ON p.eqpid = r.eqpid
      ${filterSql}
      ORDER BY p.serv_ts ASC
    `;

    return results;
  }
}
