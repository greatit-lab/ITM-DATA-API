// ITM-Data-API/src/dashboard/dashboard.service.ts
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma } from '@prisma/client';

// Raw Query 결과 타입 정의
interface AgentStatusRawResult {
  eqpid: string;
  is_online: boolean;
  last_contact: Date | null;
  pc_name: string | null;
  cpu_usage: number;
  mem_usage: number;
  app_ver: string | null;
  type: string | null;
  ip_address: string | null;
  os: string | null;
  system_type: string | null;
  locale: string | null;
  timezone: string | null;
  today_alarm_count: number;
  last_perf_serv_ts: Date | null;
  last_perf_eqp_ts: Date | null;
}

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  // 버전 비교 헬퍼
  private compareVersions(v1: string, v2: string) {
    const p1 = v1.replace(/[^0-9.]/g, '').split('.').map(Number);
    const p2 = v2.replace(/[^0-9.]/g, '').split('.').map(Number);
    for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
      const n1 = p1[i] || 0;
      const n2 = p2[i] || 0;
      if (n1 > n2) return 1;
      if (n1 < n2) return -1;
    }
    return 0;
  }

  // 1. 대시보드 요약 정보 조회
  async getSummary(site?: string, sdwt?: string) {
    try {
      // (1) 최신 Agent 버전 계산
      const distinctVersions = await this.prisma.agentInfo.findMany({
        distinct: ['appVer'],
        select: { appVer: true },
        where: { appVer: { not: null } },
      });
      const versions = distinctVersions
        .map((v) => v.appVer)
        .filter((v) => v) as string[];
      versions.sort((a, b) => this.compareVersions(a, b));
      const latestAgentVersion = versions.length > 0 ? versions[versions.length - 1] : '';

      // (2) 필터 조건 구성
      // Prisma 스키마의 Relation 필드명(sdwtRel)을 확인하여 맞춰야 함
      // 기존 스키마에 sdwtRel이 있다면 그대로 사용, 없다면 수정 필요
      const equipmentWhere: any = {};
      if (sdwt) equipmentWhere.sdwt = sdwt;
      if (site) {
        // Relation 필드명이 sdwtRel이라고 가정 (스키마 확인 필요)
        equipmentWhere.sdwtRel = {
          site: site,
          isUse: 'Y'
        };
      } else {
        equipmentWhere.sdwtRel = { isUse: 'Y' };
      }

      const now = new Date();
      const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      // (3) 주요 카운트 집계
      const totalEqp = await this.prisma.refEquipment.count({
        where: {
          ...equipmentWhere,
          agentInfo: { isNot: null }
        }
      });

      const totalServers = await this.prisma.cfgServer.count();

      const activeServers = await this.prisma.cfgServer.count({
        where: { update: { gte: tenMinutesAgo } }
      });

      const totalSdwts = await this.prisma.refSdwt.count({
        where: { isUse: 'Y', ...(site ? { site } : {}) }
      });

      // (4) 에러 통계
      let todayErrorCount = 0;
      let todayErrorTotalCount = 0;
      let newAlarmCount = 0;

      try {
        const [totalError, recentError] = await Promise.all([
          this.prisma.plgError.count({
            where: {
              timeStamp: { gte: startOfToday },
              equipment: equipmentWhere,
            },
          }),
          this.prisma.plgError.count({
            where: { timeStamp: { gte: oneHourAgo }, equipment: equipmentWhere },
          }),
        ]);
        todayErrorTotalCount = totalError;
        newAlarmCount = recentError;

        if (todayErrorTotalCount > 0) {
          const errorEqps = await this.prisma.plgError.findMany({
            where: {
              timeStamp: { gte: startOfToday },
              equipment: equipmentWhere,
            },
            distinct: ['eqpid'],
            select: { eqpid: true },
          });
          todayErrorCount = errorEqps.length;
        }
      } catch (err) {
        console.warn("[Dashboard] Error stats query failed:", err);
      }

      const inactiveAgentCount = Math.max(0, totalEqp - activeServers);

      return {
        totalEqpCount: totalEqp,
        totalServers,
        onlineAgentCount: activeServers,
        inactiveAgentCount,
        todayErrorCount,
        todayErrorTotalCount,
        newAlarmCount,
        latestAgentVersion,
        totalSdwts,
        serverHealth: totalServers > 0 ? Math.round((activeServers / totalServers) * 100) : 0
      };

    } catch (error) {
      console.error("[DashboardService] getSummary Error:", error);
      throw new InternalServerErrorException("Failed to fetch dashboard summary");
    }
  }

  // 2. Agent 상태 목록 조회 (Raw Query)
  async getAgentStatus(site?: string, sdwt?: string) {
    // Prisma.sql을 사용하여 조건절 동적 생성
    let whereCondition = Prisma.sql`WHERE r.sdwt IN (SELECT sdwt FROM public.ref_sdwt WHERE is_use = 'Y')`;

    if (sdwt) {
      whereCondition = Prisma.sql`${whereCondition} AND r.sdwt = ${sdwt}`;
    } else if (site) {
      whereCondition = Prisma.sql`${whereCondition} AND r.sdwt IN (SELECT sdwt FROM public.ref_sdwt WHERE site = ${site})`;
    }

    // 테이블명(public.agent_info 등)은 실제 DB 테이블명과 일치해야 함
    const results = await this.prisma.$queryRaw<AgentStatusRawResult[]>`
      SELECT 
          a.eqpid, 
          CASE WHEN COALESCE(s.status, 'OFFLINE') = 'ONLINE' THEN true ELSE false END AS is_online, 
          s.last_perf_update AS last_contact,
          a.pc_name, 
          COALESCE(p.cpu_usage, 0) AS cpu_usage, 
          COALESCE(p.mem_usage, 0) AS mem_usage, 
          a.app_ver,
          a.type, a.ip_address, a.os, a.system_type, a.locale, a.timezone,
          COALESCE(e.alarm_count, 0)::int AS today_alarm_count,
          p.serv_ts AS last_perf_serv_ts,
          p.ts AS last_perf_eqp_ts
      FROM public.agent_info a
      JOIN public.ref_equipment r ON a.eqpid = r.eqpid
      LEFT JOIN public.agent_status s ON a.eqpid = s.eqpid
      LEFT JOIN (
          SELECT eqpid, cpu_usage, mem_usage, serv_ts, ts, 
                 ROW_NUMBER() OVER(PARTITION BY eqpid ORDER BY serv_ts DESC) as rn
          FROM public.eqp_perf
          WHERE serv_ts >= NOW() - INTERVAL '1 day' 
      ) p ON a.eqpid = p.eqpid AND p.rn = 1
      LEFT JOIN (
          SELECT eqpid, COUNT(*) AS alarm_count 
          FROM public.plg_error 
          WHERE time_stamp >= CURRENT_DATE
          GROUP BY eqpid
      ) e ON a.eqpid = e.eqpid
      ${whereCondition}
      ORDER BY a.eqpid ASC;
    `;

    return results.map((r) => {
      let clockDrift: number | null = null;
      if (r.last_perf_serv_ts && r.last_perf_eqp_ts) {
        const servTs = new Date(r.last_perf_serv_ts).getTime();
        const eqpTs = new Date(r.last_perf_eqp_ts).getTime();
        clockDrift = (servTs - eqpTs) / 1000;
      }
      return {
        eqpId: r.eqpid,
        isOnline: r.is_online,
        lastContact: r.last_contact,
        pcName: r.pc_name,
        cpuUsage: r.cpu_usage,
        memoryUsage: r.mem_usage,
        appVersion: r.app_ver || '',
        type: r.type || '',
        ipAddress: r.ip_address || '',
        os: r.os || '',
        systemType: r.system_type || '',
        locale: r.locale || '',
        timezone: r.timezone || '',
        todayAlarmCount: r.today_alarm_count,
        clockDrift: clockDrift,
      };
    });
  }
}
