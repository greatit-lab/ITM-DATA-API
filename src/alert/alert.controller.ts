// ITM-DATA-API/src/alert/alert.controller.ts
import { Controller, Get, Post, Param, Query, ParseIntPipe } from '@nestjs/common';
import { AlertService } from './alert.service';

@Controller('alert')
// [참고] 내부망 통신용이므로 인증 가드(@UseGuards)는 제외됨
export class AlertController {
  constructor(private readonly alertService: AlertService) {}

  // 1. 내 알림 조회
  // GET /alert?userId=gily.choi
  @Get()
  async getMyAlerts(@Query('userId') userId: string) {
    // userId 유효성 검사 강화
    if (!userId || userId === 'undefined' || userId === 'null') {
      return []; 
    }
    return this.alertService.getMyAlerts(userId);
  }

  // 2. 안 읽은 개수 조회 (Polling용)
  // GET /alert/unread-count?userId=gily.choi
  @Get('unread-count')
  async getUnreadCount(@Query('userId') userId: string) {
    if (!userId || userId === 'undefined' || userId === 'null') {
      return 0;
    }
    return this.alertService.getUnreadCount(userId);
  }

  // 3. 읽음 처리
  // POST /alert/:id/read
  @Post(':id/read')
  async readAlert(@Param('id', ParseIntPipe) id: number) {
    return this.alertService.readAlert(id);
  }
}
