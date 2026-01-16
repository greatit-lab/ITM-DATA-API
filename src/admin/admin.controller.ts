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
}
