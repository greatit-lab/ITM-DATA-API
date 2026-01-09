// ITM-Data-API/src/admin/admin.controller.ts
import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { AdminService } from './admin.service';

@Controller('api/admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // --- Users & Admins ---
  @Get('users')
  getAllUsers() { return this.adminService.getAllUsers(); }

  @Get('admins')
  getAllAdmins() { return this.adminService.getAllAdmins(); }

  @Post('admins')
  addAdmin(@Body() body: any) { return this.adminService.addAdmin(body); }

  @Delete('admins/:loginId')
  deleteAdmin(@Param('loginId') loginId: string) { return this.adminService.deleteAdmin(loginId); }

  // --- Access Codes ---
  @Get('access-codes')
  getAllAccessCodes() { return this.adminService.getAllAccessCodes(); }

  @Post('access-codes')
  createAccessCode(@Body() body: any) { return this.adminService.createAccessCode(body); }

  @Patch('access-codes/:compid')
  updateAccessCode(@Param('compid') compid: string, @Body() body: any) {
    return this.adminService.updateAccessCode(compid, body);
  }

  @Delete('access-codes/:compid')
  deleteAccessCode(@Param('compid') compid: string) { return this.adminService.deleteAccessCode(compid); }

  // --- Guests ---
  @Get('guests')
  getAllGuests() { return this.adminService.getAllGuests(); }

  @Post('guests')
  addGuest(@Body() body: any) { return this.adminService.addGuest(body); }

  @Delete('guests/:loginId')
  deleteGuest(@Param('loginId') loginId: string) { return this.adminService.deleteGuest(loginId); }

  @Get('guest-requests')
  getGuestRequests() { return this.adminService.getGuestRequests(); }

  @Post('guest-requests/approve')
  approveGuestRequest(@Body() body: any) { return this.adminService.approveGuestRequest(body); }

  @Post('guest-requests/reject')
  rejectGuestRequest(@Body() body: any) { return this.adminService.rejectGuestRequest(body); }

  // --- Severities ---
  @Get('severities')
  getSeverities() { return this.adminService.getSeverities(); }

  @Post('severities')
  createSeverity(@Body() body: any) { return this.adminService.createSeverity(body); }

  @Patch('severities/:errorId')
  updateSeverity(@Param('errorId') errorId: string, @Body() body: any) {
    return this.adminService.updateSeverity(errorId, body);
  }

  @Delete('severities/:errorId')
  deleteSeverity(@Param('errorId') errorId: string) { return this.adminService.deleteSeverity(errorId); }

  // --- Metrics ---
  @Get('metrics')
  getMetrics() { return this.adminService.getMetrics(); }

  @Post('metrics')
  createMetric(@Body() body: any) { return this.adminService.createMetric(body); }

  @Patch('metrics/:metricName')
  updateMetric(@Param('metricName') metricName: string, @Body() body: any) {
    return this.adminService.updateMetric(metricName, body);
  }

  @Delete('metrics/:metricName')
  deleteMetric(@Param('metricName') metricName: string) { return this.adminService.deleteMetric(metricName); }

  // --- Ref Equipments ---
  @Get('ref-equipments')
  getRefEquipments() { return this.adminService.getRefEquipments(); }

  // --- Server Config ---
  @Get('new-server')
  getNewServerConfig() { return this.adminService.getNewServerConfig(); }

  @Patch('new-server')
  updateNewServerConfig(@Body() body: any) { return this.adminService.updateNewServerConfig(body); }

  @Get('cfg-servers')
  getCfgServers() { return this.adminService.getCfgServers(); }

  @Post('cfg-servers')
  createCfgServer(@Body() body: any) { return this.adminService.createCfgServer(body); }

  @Patch('cfg-servers/:eqpid')
  updateCfgServer(@Param('eqpid') eqpid: string, @Body() body: any) {
    return this.adminService.updateCfgServer(eqpid, body);
  }

  @Delete('cfg-servers/:eqpid')
  deleteCfgServer(@Param('eqpid') eqpid: string) { return this.adminService.deleteCfgServer(eqpid); }
}
