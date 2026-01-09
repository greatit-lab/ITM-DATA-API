// ITM-Data-API/src/dashboard/dashboard.controller.ts
import { Controller, Get, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  async getSummary(
    @Query('site') site?: string,
    @Query('sdwt') sdwt?: string,
  ) {
    return this.dashboardService.getSummary(site, sdwt);
  }

  @Get('agentstatus')
  async getAgentStatus(
    @Query('site') site?: string,
    @Query('sdwt') sdwt?: string,
  ) {
    return this.dashboardService.getAgentStatus(site, sdwt);
  }
}
