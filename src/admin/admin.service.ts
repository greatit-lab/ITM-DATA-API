// ITM-Data-API/src/admin/admin.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  // Users
  async getAllUsers() {
    return this.prisma.sysUser.findMany({ orderBy: { lastLoginAt: 'desc' } });
  }

  // Admins
  async getAllAdmins() {
    return this.prisma.cfgAdminUser.findMany();
  }
  async addAdmin(data: any) {
    return this.prisma.cfgAdminUser.create({ data });
  }
  async deleteAdmin(loginId: string) {
    return this.prisma.cfgAdminUser.delete({ where: { loginId } });
  }

  // Access Codes
  async getAllAccessCodes() {
    return this.prisma.refAccessCode.findMany({ orderBy: { compid: 'asc' } });
  }
  async createAccessCode(data: any) {
    return this.prisma.refAccessCode.create({ data });
  }
  async updateAccessCode(compid: string, data: any) {
    return this.prisma.refAccessCode.update({ where: { compid }, data });
  }
  async deleteAccessCode(compid: string) {
    return this.prisma.refAccessCode.delete({ where: { compid } });
  }

  // Guests
  async getAllGuests() {
    return this.prisma.cfgGuestAccess.findMany({ orderBy: { createdAt: 'desc' } });
  }
  async addGuest(data: any) {
    // data.validUntil이 문자열로 올 수 있으므로 변환
    if (typeof data.validUntil === 'string') {
      data.validUntil = new Date(data.validUntil);
    }
    return this.prisma.cfgGuestAccess.create({ data });
  }
  async deleteGuest(loginId: string) {
    return this.prisma.cfgGuestAccess.delete({ where: { loginId } });
  }
  async getGuestRequests() {
    return this.prisma.cfgGuestRequest.findMany({ orderBy: { createdAt: 'desc' } });
  }
  
  // Guest Request Approval Logic
  async approveGuestRequest(data: { reqId: number; approver: string; validDays: number; role?: string }) {
    const { reqId, approver, validDays, role } = data;
    
    // 1. 요청 조회
    const request = await this.prisma.cfgGuestRequest.findUnique({ where: { reqId } });
    if (!request) throw new Error('Request not found');

    // 2. 승인 처리 (상태 업데이트)
    await this.prisma.cfgGuestRequest.update({
      where: { reqId },
      data: { status: 'APPROVED', processedBy: approver, processedAt: new Date() },
    });

    // 3. Guest 권한 부여 (CfgGuestAccess 생성)
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + validDays);

    return this.prisma.cfgGuestAccess.create({
      data: {
        loginId: request.loginId,
        deptCode: request.deptCode,
        deptName: request.deptName,
        reason: request.reason,
        grantedRole: role || 'GUEST',
        validUntil: validUntil,
      },
    });
  }

  async rejectGuestRequest(data: { reqId: number; rejecter: string }) {
    return this.prisma.cfgGuestRequest.update({
      where: { reqId: data.reqId },
      data: { status: 'REJECTED', processedBy: data.rejecter, processedAt: new Date() },
    });
  }

  // Severities
  async getSeverities() {
    return this.prisma.errSeverityMap.findMany();
  }
  async createSeverity(data: any) {
    return this.prisma.errSeverityMap.create({ data });
  }
  async updateSeverity(errorId: string, data: any) {
    return this.prisma.errSeverityMap.update({ where: { errorId }, data });
  }
  async deleteSeverity(errorId: string) {
    return this.prisma.errSeverityMap.delete({ where: { errorId } });
  }

  // Metrics
  async getMetrics() {
    return this.prisma.cfgLotUniformityMetrics.findMany();
  }
  async createMetric(data: any) {
    return this.prisma.cfgLotUniformityMetrics.create({ data });
  }
  async updateMetric(metricName: string, data: any) {
    return this.prisma.cfgLotUniformityMetrics.update({ where: { metricName }, data });
  }
  async deleteMetric(metricName: string) {
    return this.prisma.cfgLotUniformityMetrics.delete({ where: { metricName } });
  }

  // Ref Equipments
  async getRefEquipments() {
    return this.prisma.refEquipment.findMany({ orderBy: { eqpid: 'asc' } });
  }

  // Server Config
  async getNewServerConfig() {
    // ID가 1인 단일 레코드 가정
    return this.prisma.cfgNewServer.findUnique({ where: { id: 1 } });
  }
  async updateNewServerConfig(data: any) {
    return this.prisma.cfgNewServer.upsert({
      where: { id: 1 },
      update: data,
      create: { id: 1, ...data },
    });
  }
  async getCfgServers() {
    return this.prisma.cfgServer.findMany();
  }
  async createCfgServer(data: any) {
    return this.prisma.cfgServer.create({ data });
  }
  async updateCfgServer(eqpid: string, data: any) {
    return this.prisma.cfgServer.update({ where: { eqpid }, data });
  }
  async deleteCfgServer(eqpid: string) {
    return this.prisma.cfgServer.delete({ where: { eqpid } });
  }
}
