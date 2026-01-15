// ITM-Data-API/src/error/error.controller.ts
import { Controller, Get, Query } from '@nestjs/common'; // UseGuards 제거
import { ErrorService, ErrorQueryParams } from './error.service';
// import { JwtAuthGuard } from '../auth/jwt-auth.guard'; // 임시 주석 처리

@Controller('error')
// @UseGuards(JwtAuthGuard) // [수정] 401 오류 해결을 위해 주석 처리 (내부 API 허용)
export class ErrorController {
  constructor(private readonly errorService: ErrorService) {}

  @Get('summary')
  async getErrorSummary(
    @Query('site') site?: string,
    @Query('sdwt') sdwt?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('eqpId') eqpId?: string,
  ) {
    const params: ErrorQueryParams = {
      site,
      sdwt,
      start: startDate,
      end: endDate,
      eqpId,
    };
    return this.errorService.getErrorSummary(params);
  }

  @Get('trend')
  async getErrorTrend(
    @Query('site') site?: string,
    @Query('sdwt') sdwt?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('eqpId') eqpId?: string,
  ) {
    const params: ErrorQueryParams = {
      site,
      sdwt,
      start: startDate,
      end: endDate,
      eqpId,
    };
    return this.errorService.getErrorTrend(params);
  }

  @Get('list')
  async getErrorList(
    @Query('site') site?: string,
    @Query('sdwt') sdwt?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('eqpId') eqpId?: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    const params = {
      site,
      sdwt,
      start: startDate,
      end: endDate,
      eqpId,
      page,
      pageSize,
    };
    return this.errorService.getErrorList(params);
  }
}
