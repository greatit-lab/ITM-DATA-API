// ITM-Data-API/src/health/health.controller.ts
import { Controller, Get, Query } from '@nestjs/common';
import { HealthService } from './health.service';

// [중요] 프론트엔드 호출 경로 대소문자 유지 ('Health')
@Controller('Health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('summary')
  async getSummary(
    @Query('site') site: string,
    @Query('sdwt') sdwt?: string
  ) {
    return this.healthService.getHealthSummary(site, sdwt);
  }
}
