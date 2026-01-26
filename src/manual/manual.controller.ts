// ITM-Data-API/src/manual/manual.controller.ts
import { Controller, Get, Put, Body } from '@nestjs/common';
import { ManualService } from './manual.service';

@Controller('manual')
export class ManualController {
  constructor(private readonly manualService: ManualService) {}

  // 조회: GET /manual (또는 /api/manual - Global Prefix 설정에 따름)
  @Get()
  async getManuals() {
    return await this.manualService.findAll();
  }

  // 저장: PUT /manual
  @Put()
  async saveManuals(@Body() body: { sections: any[] }) {
    return await this.manualService.saveAll(body.sections);
  }
}
