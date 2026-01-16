// ITM-Data-API/src/admin/admin.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  private getKstDate(): Date {
    const now = new Date();
    return new Date(now.getTime() + 9 * 60 * 60 * 1000);
  }

  // ==========================================
  // [User Management]
  // ==========================================
  async getAllUsers() {
    return this.prisma.sysUser.findMany({
      include: {
        context: {
          include: { sdwtInfo: true },
        },
      },
      orderBy: { lastLoginAt: 'desc' },
    });
  }

  // ==========================================
  // [Admin Management]
  // ==========================================
  async getAllAdmins() {
    // [확인] 사용자 제공 컬럼(assigned_at) 반영
    return this.prisma.cfgAdminUser.findMany({
      orderBy: { assignedAt: 'desc' },
    });
  }

  async addAdmin(data: any) {
    const kstNow = this.getKstDate();
    return this.prisma.cfgAdminUser.create({
      data: {
        loginId: data.loginId,
        role: data.role || 'MANAGER',
        assignedBy: data.assignedBy,
        assignedAt: kstNow,
      },
    });
  }

  async deleteAdmin(loginId: string) {
    return this.prisma.cfgAdminUser.delete({
      where: { loginId },
    });
  }

  // ==========================================
  // [Access Code / Whitelist] (수정됨)
  // ==========================================
  async getAllAccessCodes() {
    // [수정] 사용자가 제공한 컬럼 정보에 맞춰 조회
    // 실제 DB에 존재하는 컬럼만 명시적으로 select 합니다.
    return this.prisma.refAccessCode.findMany({
      orderBy: { updatedAt: 'desc' }, // updated_at이 존재한다고 하셨으므로 정렬 가능
      select: {
        compid: true,
        compName: true,
        deptid: true,
        deptName: true,
        description: true,
        isActive: true,
        updatedAt: true,
      },
    });
  }

  async createAccessCode(data: any) {
    const kstNow = this.getKstDate();
    return this.prisma.refAccessCode.create({
      data: {
        compid: data.compid, // PK로 사용됨
        compName: data.compName,
        deptid: data.deptid,
        deptName: data.deptName,
        description: data.description,
        isActive: 'Y',
        updatedAt: kstNow,
      },
    });
  }

  // [수정] Key를 id(number) -> compid(string)로 변경
  async updateAccessCode(compid: string, data: any) {
    const kstNow = this.getKstDate();
    return this.prisma.refAccessCode.update({
      where: { compid }, // Schema에서 @id로 설정한 컬럼
      data: {
        // compid는 PK이므로 수정 불가 (필요시 삭제 후 재생성)
        compName: data.compName,
        deptid: data.deptid,
        deptName: data.deptName,
        description: data.description,
        isActive: data.isActive,
        updatedAt: kstNow,
      },
    });
  }

  // [수정] Key를 id(number) -> compid(string)로 변경
  async deleteAccessCode(compid: string) {
    return this.prisma.refAccessCode.delete({
      where: { compid },
    });
  }

  // ==========================================
  // [Guest Management]
  // ==========================================
  async getAllGuests() {
    return this.prisma.cfgGuestAccess.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async addGuest(data: any) {
    const kstNow = this.getKstDate();
    return this.prisma.cfgGuestAccess.create({
      data: {
        loginId: data.loginId,
        deptCode: data.deptCode,
        deptName: data.deptName,
        reason: data.reason,
        validUntil: new Date(data.validUntil),
        grantedRole: 'GUEST',
        createdAt: kstNow, 
      },
    });
  }

  async deleteGuest(loginId: string) {
    return this.prisma.cfgGuestAccess.delete({
      where: { loginId },
    });
  }

  // ==========================================
  // [Guest Request]
  // ==========================================
  async getGuestRequests() {
    return this.prisma.cfgGuestRequest.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async approveGuestRequest(reqId: number, approverId: string) {
    const request = await this.prisma.cfgGuestRequest.findUnique({ where: { reqId } });
    if (!request) throw new NotFoundException('Request not found');

    const kstNow = this.getKstDate();
    const validUntil = new Date(kstNow.getTime());
    validUntil.setDate(validUntil.getDate() + 30);

    return this.prisma.$transaction(async (tx) => {
      await tx.cfgGuestRequest.update({
        where: { reqId },
        data: {
          status: 'APPROVED',
          processedBy: approverId,
          processedAt: kstNow,
        },
      });

      const guest = await tx.cfgGuestAccess.upsert({
        where: { loginId: request.loginId },
        update: {
          validUntil: validUntil,
          reason: request.reason,
          grantedRole: 'GUEST',
        },
        create: {
          loginId: request.loginId,
          deptCode: request.deptCode,
          deptName: request.deptName,
          reason: request.reason,
          grantedRole: 'GUEST',
          validUntil: validUntil,
          createdAt: kstNow,
        },
      });
      return guest;
    });
  }

  async rejectGuestRequest(reqId: number, rejectorId: string) {
    const kstNow = this.getKstDate();
    return this.prisma.cfgGuestRequest.update({
      where: { reqId },
      data: {
        status: 'REJECTED',
        processedBy: rejectorId,
        processedAt: kstNow,
      },
    });
  }

  // ==========================================
  // [Infra]
  // ==========================================
  async getSeverities() {
    return this.prisma.errSeverityMap.findMany();
  }

  async addSeverity(data: any) {
    return this.prisma.errSeverityMap.create({
      data: {
        errorId: data.errorId,
        severity: data.severity,
      },
    });
  }

  async updateSeverity(errorId: string, data: any) {
    return this.prisma.errSeverityMap.update({
      where: { errorId },
      data: {
        severity: data.severity,
      },
    });
  }

  async deleteSeverity(errorId: string) {
    return this.prisma.errSeverityMap.delete({
      where: { errorId },
    });
  }

  async getMetrics() {
    return this.prisma.cfgLotUniformityMetrics.findMany();
  }

  async addMetric(data: any) {
    return this.prisma.cfgLotUniformityMetrics.create({
      data: {
        metricName: data.metricName,
        isExcluded: data.isExcluded ? 'Y' : 'N',
      },
    });
  }

  async updateMetric(metricName: string, data: any) {
    return this.prisma.cfgLotUniformityMetrics.update({
      where: { metricName },
      data: {
        isExcluded: data.isExcluded ? 'Y' : 'N',
      },
    });
  }

  async deleteMetric(metricName: string) {
    return this.prisma.cfgLotUniformityMetrics.delete({
      where: { metricName },
    });
  }
}
