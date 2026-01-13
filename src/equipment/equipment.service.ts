// ITM-Data-API/src/equipment/equipment.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class EquipmentService {
  constructor(private prisma: PrismaService) {}

  // 1. 인프라 관리용 목록 조회
  async getInfraList() {
    return this.prisma.refEquipment.findMany({
      include: {
        sdwtRel: true, // SDWT 정보 포함
      },
      orderBy: { eqpid: 'asc' },
    });
  }

  // 2. 장비 상세 조회 (Explorer 등)
  async getEquipmentDetails(params: {
    site?: string;
    sdwt?: string;
    eqpId?: string;
  }) {
    const { site, sdwt, eqpId } = params;
    
    // 동적 필터 조건 생성
    const where: Prisma.RefEquipmentWhereInput = {};
    
    if (eqpId) {
      where.eqpid = { contains: eqpId, mode: 'insensitive' };
    }
    
    if (sdwt || site) {
      where.sdwtRel = {};
      if (sdwt) where.sdwtRel.sdwt = sdwt;
      if (site) where.sdwtRel.site = site;
    }

    // AgentInfo가 있는 장비 위주로 조회 (Left Join)
    const results = await this.prisma.refEquipment.findMany({
      where,
      include: {
        agentInfo: true,
        agentStatus: true,
        sdwtRel: true,
        itmInfo: true,
      },
      orderBy: { eqpid: 'asc' },
    });

    // DTO 변환 (Frontend 요구사항에 맞춤)
    return results.map(eqp => {
      // [수정] 타입 에러 해결: 빈 객체 대신 any로 캐스팅하여 속성 접근 허용
      const info: any = eqp.agentInfo || {};
      const status: any = eqp.agentStatus || {};
      const itm: any = eqp.itmInfo || {};

      return {
        eqpId: eqp.eqpid,
        pcName: info.pcName || '-',
        isOnline: status.status === 'Running' || status.status === 'Idle',
        ipAddress: info.ipAddress || '-',
        lastContact: status.lastPerfUpdate ? new Date(status.lastPerfUpdate).toISOString() : null,
        os: info.os || '-',
        systemType: info.systemType || '-',
        timezone: info.timezone || '-',
        macAddress: info.macAddress || '-',
        cpu: info.cpu || '-',
        memory: info.memory || '-',
        disk: info.disk || '-',
        vga: info.vga || '-',
        type: info.type || '-',
        locale: info.locale || '-',
        systemModel: itm.systemModel || eqp.model || '-',
        serialNum: itm.serialNum || '-',
        application: itm.application || '-',
        version: itm.version || info.appVer || '-',
        dbVersion: itm.dbVersion || '-',
      };
    });
  }

  // 3. 장비 ID 목록 조회 (Dropdown 용)
  async getEqpIds(params: { site?: string; sdwt?: string; type?: string }) {
    const { site, sdwt, type } = params;
    const where: Prisma.RefEquipmentWhereInput = {};

    if (sdwt) {
      where.sdwt = sdwt;
    } else if (site) {
      where.sdwtRel = { site };
    }

    // [수정] type이 'wafer'이거나 특정 분석 페이지용일 경우, 
    // ITM Agent가 설치된 장비(AgentInfo 존재)만 필터링
    if (type === 'wafer' || type === 'agent') {
      where.agentInfo = {
        isNot: null, // AgentInfo가 존재하는 레코드만 선택
      };
    }

    const results = await this.prisma.refEquipment.findMany({
      where,
      select: { eqpid: true },
      orderBy: { eqpid: 'asc' },
    });

    return results.map((r) => r.eqpid);
  }

  // 4. 단일 장비 조회
  async getEquipment(eqpId: string) {
    const eqp = await this.prisma.refEquipment.findUnique({
      where: { eqpid: eqpId },
      include: { sdwtRel: true },
    });

    if (!eqp) throw new NotFoundException(`Equipment ${eqpId} not found`);
    return eqp;
  }

  // 5. 장비 추가
  async createEquipment(data: Prisma.RefEquipmentCreateInput) {
    return this.prisma.refEquipment.create({ data });
  }

  // 6. 장비 수정
  async updateEquipment(eqpId: string, data: Prisma.RefEquipmentUpdateInput) {
    return this.prisma.refEquipment.update({
      where: { eqpid: eqpId },
      data,
    });
  }

  // 7. 장비 삭제
  async deleteEquipment(eqpId: string) {
    return this.prisma.refEquipment.delete({
      where: { eqpid: eqpId },
    });
  }
}
