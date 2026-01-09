// ITM-Data-Api/src/lamplife/lamplife.controller.ts
import { Controller, Get, Query } from '@nestjs/common';
import { LampLifeService } from './lamplife.service';

@Controller('lamplife')
export class LampLifeController {
  constructor(private readonly lampLifeService: LampLifeService) {}

  @Get()
  async getLampData(
    @Query('site') site?: string,
    @Query('sdwt') sdwt?: string,
    @Query('eqpId') eqpId?: string,
  ) {
    return this.lampLifeService.getLampData(site, sdwt, eqpId);
  }
}
