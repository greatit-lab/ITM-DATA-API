// ITM-Data-API/src/filters/filters.controller.ts
import { Controller, Get, Query } from '@nestjs/common';
import { FiltersService } from './filters.service';

// [중요] 프론트엔드 호출 경로가 '/api/Filters/...' 이므로 대문자 F 유지
@Controller('Filters')
export class FiltersController {
  constructor(private readonly filtersService: FiltersService) {}

  // 1. Site 목록 조회
  // GET /api/Filters/sites
  @Get('sites')
  async getSites() {
    return this.filtersService.getSites();
  }

  // 2. SDWT 목록 조회
  // GET /api/Filters/sdwts?site=Osan
  @Get('sdwts')
  async getSdwts(@Query('site') site: string) {
    return this.filtersService.getSdwts(site);
  }
}
