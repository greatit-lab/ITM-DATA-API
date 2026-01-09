// ITM-Data-API/src/admin/admin.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  // 1. 사용자 관리 (CfgAdminUser)
  async getAdminUsers() {
    return this.prisma.cfgAdminUser.findMany({
      orderBy: { assignedAt: 'desc' },
    });
  }

  async addAdminUser(data: Prisma.CfgAdminUserCreateInput) {
    return this.prisma.cfgAdminUser.create({ data });
  }

  async deleteAdminUser(loginId: string) {
    return this.prisma.cfgAdminUser.delete({
      where: { loginId },
    });
  }

  // 2. 게스트 권한 관리 (CfgGuestAccess)
  async getGuestAccessList() {
    return this.prisma.cfgGuestAccess.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async grantGuestAccess(data: Prisma.CfgGuestAccessCreateInput) {
    return this.prisma.cfgGuestAccess.create({ data });
  }

  async revokeGuestAccess(loginId: string) {
    return this.prisma.cfgGuestAccess.delete({
      where: { loginId },
    });
  }

  // 3. 게스트 요청 관리 (CfgGuestRequest)
  async getGuestRequests() {
    return this.prisma.cfgGuestRequest.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async approveGuestRequest(reqId: number, approverId: string) {
    const request = await this.prisma.cfgGuestRequest.findUnique({
      where: { reqId },
    });

    if (!request) throw new Error('Request not found');

    // 트랜잭션: 요청 상태 업데이트 + 게스트 권한 부여
    return this.prisma.$transaction(async (tx) => {
      // 1. 요청 상태 승인으로 변경
      await tx.cfgGuestRequest.update({
        where: { reqId },
        data: {
          status: 'APPROVED',
          processedBy: approverId,
          processedAt: new Date(),
        },
      });

      // 2. 게스트 권한 테이블에 추가 (이미 있으면 업데이트)
      // 만료일은 현재 + 24시간으로 설정 (예시)
      const validUntil = new Date();
      validUntil.setHours(validUntil.getHours() + 24);

      return tx.cfgGuestAccess.upsert({
        where: { loginId: request.loginId },
        update: {
          validUntil,
          reason: request.reason,
        },
        create: {
          loginId: request.loginId,
          deptCode: request.deptCode,
          deptName: request.deptName,
          reason: request.reason,
          validUntil,
          grantedRole: 'GUEST',
        },
      });
    });
  }

  async rejectGuestRequest(reqId: number, rejectorId: string) {
    return this.prisma.cfgGuestRequest.update({
      where: { reqId },
      data: {
        status: 'REJECTED',
        processedBy: rejectorId,
        processedAt: new Date(),
      },
    });
  }
}
