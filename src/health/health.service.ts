// ITM-Data-API/src/health/health.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

export interface HealthDto {
  eqpId: string;
  totalScore: number;
  status: 'Good' | 'Warning' | 'Critical';
  factors: {
    reliability: number; // 신뢰성 (30점)
    performance: number; // 성능 (20점)
    component: number;   // 부품 (20점)
    optical: number;     // 광학 (20점)
    stability: number;   // 안정성 (10점)
  };
  details: {
    errorCount: number;
    avgResourceUsage: number;
    lampUsageRatio: number; // 대표 사용률 (가중치 적용됨)
    tempVolatility: number;
    avgIntensity: number;
    snrValue: number;
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
  avgRatio: number | null;
  maxRatio: number | null;
}

interface OpticalStatRaw {
  eqpid: string;
  values: number[];
}

@Injectable()
export class HealthService {
  constructor(private prisma: PrismaService) {}

  async getHealthSummary(site?: string, sdwt?: string): Promise<HealthDto[]> {
    // 1. 대상 장비 목록 조회
    const equipmentWhere: any = {};

    if (sdwt) {
      equipmentWhere.sdwt = sdwt;
    }
    if (site) {
      equipmentWhere.sdwtRel = { site: site, isUse: 'Y' };
    } else {
      equipmentWhere.sdwtRel = { isUse: 'Y' };
    }

    equipmentWhere.agentInfo = { isNot: null };

    const equipments = await this.prisma.refEquipment.findMany({
      where: equipmentWhere,
      select: { eqpid: true },
    });

    const eqpIds = equipments.map((e) => e.eqpid);
    if (eqpIds.length === 0) return [];

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); 
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000); 

    // ---------------------------------------------------------
    // 2. 데이터 집계 (Data Aggregation)
    // ---------------------------------------------------------

    // (A) 에러 건수 (Reliability)
    const errorStats = await this.prisma.plgError.groupBy({
      by: ['eqpid'],
      where: {
        eqpid: { in: eqpIds },
        timeStamp: { gte: sevenDaysAgo },
      },
      _count: { _all: true },
    });

    const eqpIdString = eqpIds.map((id) => `'${id}'`).join(',');

    // (B) 성능 및 온도 안정성 (Performance & Stability)
    const perfRaw = await this.prisma.$queryRawUnsafe<PerfStatRaw[]>(
      `SELECT 
        eqpid, 
        AVG(COALESCE(cpu_usage, 0) + COALESCE(mem_usage, 0)) / 2 as "avgUsage",
        STDDEV(COALESCE(cpu_temp, 0)) as "tempStd"
      FROM public.eqp_perf
      WHERE eqpid IN (${eqpIdString})
        AND serv_ts >= '${oneDayAgo.toISOString()}'
      GROUP BY eqpid`,
    );

    // (C) 램프 수명 비율 (Component) - AVG와 MAX 동시 조회
    const lampRaw = await this.prisma.$queryRawUnsafe<LampStatRaw[]>(
      `SELECT 
        eqpid, 
        AVG(age_hour::float / NULLIF(lifespan_hour, 0)) as "avgRatio",
        MAX(age_hour::float / NULLIF(lifespan_hour, 0)) as "maxRatio"
      FROM public.eqp_lamp_life
      WHERE eqpid IN (${eqpIdString})
      GROUP BY eqpid`,
    );

    // (D) 광학 데이터 (Optical)
    const opticalRaw = await this.prisma.$queryRawUnsafe<OpticalStatRaw[]>(
      `SELECT DISTINCT ON (eqpid)
         eqpid, values
       FROM public.plg_onto_spectrum
       WHERE eqpid IN (${eqpIdString})
       ORDER BY eqpid, ts DESC`
    );

    // ---------------------------------------------------------
    // 3. 데이터 매핑 (Map 변환)
    // ---------------------------------------------------------
    const errorMap = new Map(errorStats.map((e) => [e.eqpid, e._count._all]));

    const perfMap = new Map(
      perfRaw.map((p) => [
        p.eqpid,
        { usage: Number(p.avgUsage || 0), std: Number(p.tempStd || 0) },
      ]),
    );

    // 램프 맵: { avg, max } 객체 저장
    const lampMap = new Map(
      lampRaw.map((l) => [
        l.eqpid, 
        { avg: Number(l.avgRatio || 0), max: Number(l.maxRatio || 0) }
      ]),
    );

    const opticalMap = new Map(
      opticalRaw.map((o) => [o.eqpid, o.values || []])
    );

    // ---------------------------------------------------------
    // 4. 점수 산정 알고리즘 (Scoring Logic) - [현실화 개선]
    // ---------------------------------------------------------
    return eqpIds
      .map((eqpId) => {
        // [Factor 1] 신뢰성 (Reliability) - 배점 30점
        const errorCount = errorMap.get(eqpId) || 0;
        const reliabilityScore = Math.max(0, 30 - errorCount * 3);

        // [Factor 2] 성능 (Performance) - 배점 20점
        const perf = perfMap.get(eqpId) || { usage: 0, std: 0 };
        const resourceScore = Math.max(
          0,
          20 * (1 - Math.max(0, perf.usage - 30) / 70),
        );

        // [Factor 3] 부품 (Component) - 배점 20점 [로직 현실화]
        // 전략: 전체 효율(AVG)과 리스크(MAX)를 3:7 비율로 반영하여 점수 산정
        const lampData = lampMap.get(eqpId) || { avg: 0, max: 0 };
        
        // Weighted Ratio: 평균 30%, 최대 70% 반영 (위험 요소 우선 반영)
        const weightedRatio = (lampData.avg * 0.3) + (lampData.max * 0.7);
        
        let componentScore = 0;
        
        // 1. 안전 구간: 80% 이하 사용 시 만점 (20점)
        if (weightedRatio <= 0.8) {
          componentScore = 20;
        } else {
          // 2. 감점 구간: 80% ~ 130%까지 선형 감점
          //    - 100% 도달 시: 약 12점 (양호하지만 주의 필요)
          //    - 130% 도달 시: 0점 (심각)
          const penalty = Math.min(1, (weightedRatio - 0.8) / 0.5); 
          componentScore = Math.round(20 * (1 - penalty));
        }

        // [Factor 4] 광학 (Optical) - 배점 20점
        const spectrumValues = opticalMap.get(eqpId) || [];
        let opticalScore = 20; 
        let avgIntensity = 0;
        let snrValue = 0;

        if (spectrumValues.length > 0) {
          const maxVal = Math.max(...spectrumValues);
          const minVal = Math.min(...spectrumValues); 
          const avgVal = spectrumValues.reduce((a, b) => a + b, 0) / spectrumValues.length;
          avgIntensity = Math.round(avgVal);

          const noise = minVal > 0 ? minVal : 1;
          snrValue = parseFloat((20 * Math.log10(maxVal / noise)).toFixed(1));

          if (snrValue < 20) opticalScore = 0;
          else if (snrValue >= 40) opticalScore = 20;
          else opticalScore = Math.round(snrValue - 20); 
        } else {
          opticalScore = 0;
        }

        // [Factor 5] 안정성 (Stability) - 배점 10점 [로직 현실화]
        const tempStd = perf.std;
        let stabilityScore = 0;

        // 1. 허용 오차: 표준편차 2.0 이하는 안정적인 제어 상태로 보아 만점 부여
        if (tempStd <= 2.0) {
          stabilityScore = 10;
        } else {
          // 2. 2.0 초과 시 감점 (7.0 도달 시 0점)
          //    - 미세한 흔들림에는 점수를 후하게, 큰 흔들림에만 페널티
          const penalty = Math.min(1, (tempStd - 2.0) / 5.0);
          stabilityScore = Math.round(10 * (1 - penalty));
        }

        // [Total] 총점 계산
        const totalScore = Math.round(
          reliabilityScore + resourceScore + componentScore + opticalScore + stabilityScore,
        );

        // [Status]
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
            optical: Math.round(opticalScore),
            stability: Math.round(stabilityScore),
          },
          details: {
            errorCount,
            avgResourceUsage: perf.usage,
            lampUsageRatio: weightedRatio * 100, // 가중치가 적용된 사용률 표시
            tempVolatility: perf.std,
            avgIntensity,
            snrValue,
          },
        };
      })
      .sort((a, b) => a.totalScore - b.totalScore); 
  }
}
