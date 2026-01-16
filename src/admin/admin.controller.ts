// ITM-Data-API/src/admin/admin.controller.ts
import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { AdminService } from './admin.service';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ==========================================
  // [User Management] 시스템 사용자 조회
  // ==========================================
  @Get('users')
  async getAllUsers() {
    return this.adminService.getAllUsers();
  }

  // ==========================================
  // [Guest Management] 게스트 관리
  // ==========================================
  @Get('guests')
  async getAllGuests() {
    return this.adminService.getAllGuests();
  }

  @Post('guests')
  async addGuest(@Body() body: any) {
    return this.adminService.addGuest(body);
  }

  @Delete('guests/:loginId')
  async deleteGuest(@Param('loginId') loginId: string) {
    return this.adminService.deleteGuest(loginId);
  }

  // ==========================================
  // [Guest Request] 접근 신청 관리
  // ==========================================
  @Get('guest/request')
  async getGuestRequests() {
    return this.adminService.getGuestRequests();
  }

  @Put('guest/request/:reqId/approve')
  async approveGuestRequest(
    @Param('reqId') reqId: string, 
    @Body() body: { approverId: string }
  ) {
    return this.adminService.approveGuestRequest(parseInt(reqId), body.approverId);
  }

  @Put('guest/request/:reqId/reject')
  async rejectGuestRequest(
    @Param('reqId') reqId: string,
    @Body() body: { rejectorId: string }
  ) {
    return this.adminService.rejectGuestRequest(parseInt(reqId), body.rejectorId);
  }

  // ==========================================
  // [추가] 1. 에러 심각도 (Error Severity)
  // ==========================================
  @Get('severity')
  async getSeverities() {
    return this.adminService.getSeverities();
  }

  @Post('severity')
  async addSeverity(@Body() body: any) {
    return this.adminService.addSeverity(body);
  }

  @Put('severity/:errorId')
  async updateSeverity(
    @Param('errorId') errorId: string,
    @Body() body: any
  ) {
    return this.adminService.updateSeverity(errorId, body);
  }

  @Delete('severity/:errorId')
  async deleteSeverity(@Param('errorId') errorId: string) {
    return this.adminService.deleteSeverity(errorId);
  }

  // ==========================================
  // [추가] 2. 분석 지표 (Analysis Metrics)
  // ==========================================
  @Get('metrics')
  async getMetrics() {
    return this.adminService.getMetrics();
  }

  @Post('metrics')
  async addMetric(@Body() body: any) {
    return this.adminService.addMetric(body);
  }

  @Put('metrics/:metricName')
  async updateMetric(
    @Param('metricName') metricName: string,
    @Body() body: any
  ) {
    return this.adminService.updateMetric(metricName, body);
  }

  @Delete('metrics/:metricName')
  async deleteMetric(@Param('metricName') metricName: string) {
    return this.adminService.deleteMetric(metricName);
  }
}
