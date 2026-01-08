// ITM-Data-API/src/prealign/prealign.controller.ts
import { Controller, Get, Query } from '@nestjs/common';
import { PreAlignService } from './prealign.service';

@Controller('prealign')
export class PreAlignController {
  constructor(private readonly preAlignService: PreAlignService) {}

  @Get()
  async getPreAlignData(
    @Query('eqpId') eqpId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.preAlignService.getLog(eqpId, startDate, endDate);
  }
}
