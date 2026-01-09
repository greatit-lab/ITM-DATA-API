// ITM-Data-API/src/health/health.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

// [인터페이스] 건전성 평가 결과 DTO
export interface HealthDto {
  eqpId: string;
  totalScore: number;
  status: 'Good' | 'Warning' | 'Critical';
  factors: {
    reliability: number; // 신뢰성 (에러)
    performance: number; // 성능 (리소스)
    component: number;   // 부품 (램프)
    stability: number;   // 안정성 (온도)
  };
  details: {
    errorCount: number;
    avgResourceUsage: number;
    lampUsageRatio: number;
    tempVolatility: number;
  };
}

// Raw Query 결과 매핑용 인터페이스
interface PerfStatRaw {
  eqpid: string;
  avgUsage: number | null;
  tempStd: number | null;
}

interface LampStatRaw {
  eqpid: string;
  usageRatio: number | null;
}

@Injectable()
export class HealthService {
  constructor(private prisma: PrismaService) {}

  async getHealthSummary(site?: string, sdwt?: string): Promise<HealthDto[]> {
    // 1. 대상 장비 목록 조회 (필터링)
    const equipmentWhere: any = {};
    
    // SDWT 필터
    if (sdwt) {
      equipmentWhere.sdwt = sdwt;
    }
    
    // Site 필터 (RefSdwt 관계 활용)
    if (site) {
      equipmentWhere.sdwtRel = {
        site: site,
        isUse: 'Y',
      };
    } else {
      equipmentWhere.sdwtRel = {
        isUse: 'Y',
      };
    }

    const equipments = await this.prisma.refEquipment.findMany({
      where: equipmentWhere,
      select: { eqpid: true },
    });

    const eqpIds = equipments.map((e) => e.eqpid);
    if (eqpIds.length === 0) return [];

    // 기준 시간 설정
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 에러 집계 (7일)
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);        // 성능 집계 (1일)

    // 2. 데이터 집계 (병렬 처리 권장되나, 안정성을 위해 순차 처리 또는 Promise.all 활용)
    
    // (A) 에러 건수 집계 (Prisma GroupBy)
    const errorStats = await this.prisma.plgError.groupBy({
      by: ['eqpid'],
      where: { 
        eqpid: { in: eqpIds }, 
        timeStamp: { gte: sevenDaysAgo } 
      },
      _count: { _all: true },
    });

    // (B) 성능 통계 (리소스 사용률 평균, 온도 표준편차) - Raw Query
    const eqpIdString = eqpIds.map((id) => `'${id}'`).join(',');
    
    // PostgreSQL Raw Query: eqp_perf 테이블
    const perfRaw = await this.prisma.$queryRawUnsafe<PerfStatRaw[]>(
      `SELECT 
        eqpid, 
        AVG(cpu_usage + mem_usage) / 2 as "avgUsage",
        STDDEV(cpu_temp) as "tempStd"
      FROM public.eqp_perf
      WHERE eqpid IN (${eqpIdString})
        AND serv_ts >= '${oneDayAgo.toISOString()}'
      GROUP BY eqpid`
    );

    // (C) 램프 수명 비율 (현재 사용 시간 / 수명) - Raw Query
    // PostgreSQL Raw Query: eqp_lamp_life 테이블
    const lampRaw = await this.prisma.$queryRawUnsafe<LampStatRaw[]>(
      `SELECT 
        eqpid, 
        MAX(age_hour::float / NULLIF(lifespan_hour, 0)) as "usageRatio"
      FROM public.eqp_lamp_life
      WHERE eqpid IN (${eqpIdString})
      GROUP BY eqpid`
    );

    // 3. 데이터 매핑 (Map 변환)
    const errorMap = new Map(errorStats.map((e) => [e.eqpid, e._count._all]));
    
    const perfMap = new Map(perfRaw.map((p) => [
      p.eqpid, 
      { usage: Number(p.avgUsage || 0), std: Number(p.tempStd || 0) }
    ]));
    
    const lampMap = new Map(lampRaw.map((l) => [
      l.eqpid, 
      Number(l.usageRatio || 0)
    ]));

    // 4. 점수 산정 알고리즘
    return eqpIds.map((eqpId) => {
      // (1) 신뢰성 (Reliability): 에러가 적을수록 고득점 (기본 40점)
      const errorCount = errorMap.get(eqpId) || 0;
      const reliabilityScore = Math.max(0, 40 - errorCount * 4);

      // (2) 성능 (Performance): 리소스 사용률이 적절할수록 고득점 (기본 30점)
      // 사용률 20% 이하는 안정적, 그 이상부터 감점
      const perf = perfMap.get(eqpId) || { usage: 0, std: 0 };
      const resourceScore = Math.max(0, 30 * (1 - Math.max(0, perf.usage - 20) / 70));

      // (3) 부품 (Component): 램프 수명이 많이 남을수록 고득점 (기본 20점)
      const lampRatio = lampMap.get(eqpId) || 0;
      const componentScore = Math.max(0, 20 * (1 - Math.min(1, lampRatio)));

      // (4) 안정성 (Stability): 온도 변화가 적을수록 고득점 (기본 10점)
      const stabilityScore = Math.max(0, 10 * (1 - Math.min(1, perf.std / 5)));

      // 총점 계산
      const totalScore = Math.round(reliabilityScore + resourceScore + componentScore + stabilityScore);

      // 상태 등급 판정
      let status: 'Good' | 'Warning' | 'Critical' = 'Good';
      if (totalScore < 60) status = 'Critical';
      else if (totalScore < 80) status = 'Warning';

      return {
        eqpId,
        totalScore,
        status,
        factors: {
          reliability: Math.round(reliabilityScore),
          performance: Math.round(resourceScore),
          component: Math.round(componentScore),
          stability: Math.round(stabilityScore),
        },
        details: {
          errorCount,
          avgResourceUsage: perf.usage,
          lampUsageRatio: lampRatio * 100,
          tempVolatility: perf.std,
        },
      };
    }).sort((a, b) => a.totalScore - b.totalScore); // 점수 낮은 순(위험한 장비 우선) 정렬
  }
}
