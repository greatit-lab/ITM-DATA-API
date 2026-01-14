// ITM-Data-API/src/health/health.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

// [인터페이스] 건전성 평가 결과 DTO
export interface HealthDto {
  eqpId: string;
  totalScore: number;
  status: 'Good' | 'Warning' | 'Critical';
  factors: {
    reliability: number; // 신뢰성 (30점)
    performance: number; // 성능 (20점)
    component: number;   // 부품 (20점)
    optical: number;     // 광학 (20점) - [실데이터 연동]
    stability: number;   // 안정성 (10점)
  };
  details: {
    errorCount: number;
    avgResourceUsage: number;
    lampUsageRatio: number;
    tempVolatility: number;
    avgIntensity: number; // 평균 조도
    snrValue: number;     // 신호 대 잡음비
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

interface OpticalStatRaw {
  eqpid: string;
  values: number[]; // 스펙트럼 데이터 배열
}

@Injectable()
export class HealthService {
  constructor(private prisma: PrismaService) {}

  async getHealthSummary(site?: string, sdwt?: string): Promise<HealthDto[]> {
    // 1. 대상 장비 목록 조회 (필터링)
    const equipmentWhere: any = {};

    // SDWT & Site 필터
    if (sdwt) {
      equipmentWhere.sdwt = sdwt;
    }
    if (site) {
      equipmentWhere.sdwtRel = { site: site, isUse: 'Y' };
    } else {
      equipmentWhere.sdwtRel = { isUse: 'Y' };
    }

    // ITM Agent가 설치된 장비만 조회
    equipmentWhere.agentInfo = { isNot: null };

    const equipments = await this.prisma.refEquipment.findMany({
      where: equipmentWhere,
      select: { eqpid: true },
    });

    const eqpIds = equipments.map((e) => e.eqpid);
    if (eqpIds.length === 0) return [];

    // 기준 시간 설정
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); 
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000); 

    // ---------------------------------------------------------
    // 2. 데이터 집계 (Data Aggregation)
    // ---------------------------------------------------------

    // (A) 에러 건수 집계 (Reliability) - Prisma GroupBy
    const errorStats = await this.prisma.plgError.groupBy({
      by: ['eqpid'],
      where: {
        eqpid: { in: eqpIds },
        timeStamp: { gte: sevenDaysAgo },
      },
      _count: { _all: true },
    });

    const eqpIdString = eqpIds.map((id) => `'${id}'`).join(',');

    // (B) 성능 통계 (Performance & Stability) - Raw Query
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

    // (C) 램프 수명 비율 (Component) - Raw Query
    const lampRaw = await this.prisma.$queryRawUnsafe<LampStatRaw[]>(
      `SELECT 
        eqpid, 
        MAX(age_hour::float / NULLIF(lifespan_hour, 0)) as "usageRatio"
      FROM public.eqp_lamp_life
      WHERE eqpid IN (${eqpIdString})
      GROUP BY eqpid`,
    );

    // (D) 광학 데이터 (Optical) - Raw Query [Optical Health Analytics와 동일 소스]
    // 각 장비별 가장 최근의 스펙트럼 데이터 조회
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

    const lampMap = new Map(
      lampRaw.map((l) => [l.eqpid, Number(l.usageRatio || 0)]),
    );

    const opticalMap = new Map(
      opticalRaw.map((o) => [o.eqpid, o.values || []])
    );

    // ---------------------------------------------------------
    // 4. 점수 산정 알고리즘 (Scoring Logic)
    // ---------------------------------------------------------
    return eqpIds
      .map((eqpId) => {
        // [Factor 1] 신뢰성 (Reliability) - 배점 30점
        const errorCount = errorMap.get(eqpId) || 0;
        // 에러 0건: 30점, 1건당 3점 감점 (10건 이상이면 0점)
        const reliabilityScore = Math.max(0, 30 - errorCount * 3);

        // [Factor 2] 성능 (Performance) - 배점 20점
        const perf = perfMap.get(eqpId) || { usage: 0, std: 0 };
        // 리소스 사용률 30% 이하: 만점, 그 이상부터 선형 감점
        const resourceScore = Math.max(
          0,
          20 * (1 - Math.max(0, perf.usage - 30) / 70),
        );

        // [Factor 3] 부품 (Component) - 배점 20점
        const lampRatio = lampMap.get(eqpId) || 0;
        // 수명이 많이 남을수록(사용률이 낮을수록) 고득점
        const componentScore = Math.max(0, 20 * (1 - Math.min(1, lampRatio)));

        // [Factor 4] 광학 (Optical) - 배점 20점 (실데이터 반영)
        const spectrumValues = opticalMap.get(eqpId) || [];
        let opticalScore = 20; // 기본값
        let avgIntensity = 0;
        let snrValue = 0;

        if (spectrumValues.length > 0) {
          const maxVal = Math.max(...spectrumValues);
          const minVal = Math.min(...spectrumValues); 
          const avgVal = spectrumValues.reduce((a, b) => a + b, 0) / spectrumValues.length;
          
          avgIntensity = Math.round(avgVal);

          // SNR(Signal-to-Noise Ratio) 계산: 20 * log10(Max / Noise)
          // Noise가 0이면 1로 보정
          const noise = minVal > 0 ? minVal : 1;
          snrValue = parseFloat((20 * Math.log10(maxVal / noise)).toFixed(1));

          // 점수 산정: SNR 40dB 이상 양호(만점), 20dB 미만 불량(0점)
          if (snrValue < 20) opticalScore = 0;
          else if (snrValue >= 40) opticalScore = 20;
          else opticalScore = Math.round(snrValue - 20); // 20~40dB 사이 비례 점수
        } else {
          // 데이터가 없으면 0점 처리 (센서 미감지)
          opticalScore = 0;
        }

        // [Factor 5] 안정성 (Stability) - 배점 10점
        // 온도 변화 표준편차가 0에 가까울수록 고득점 (5도 이상 흔들리면 0점)
        const stabilityScore = Math.max(
          0,
          10 * (1 - Math.min(1, perf.std / 5)),
        );

        // [Total] 총점 계산 (Max 100)
        const totalScore = Math.round(
          reliabilityScore + resourceScore + componentScore + opticalScore + stabilityScore,
        );

        // [Status] 상태 등급 판정
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
            lampUsageRatio: lampRatio * 100,
            tempVolatility: perf.std,
            avgIntensity,
            snrValue,
          },
        };
      })
      .sort((a, b) => a.totalScore - b.totalScore); // 점수 낮은 순(위험 장비) 우선 정렬
  }
}
