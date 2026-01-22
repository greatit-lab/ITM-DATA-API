// ITM-DATA-API/src/alert/alert.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class AlertService {
  constructor(private prisma: PrismaService) {}

  // 1. 알림 생성
  async createAlert(userId: string, message: string, link: string) {
    return this.prisma.sysAlert.create({
      data: {
        userId,
        type: 'BOARD_REPLY',
        message,
        link,
        isRead: false,
      },
    });
  }

  // 2. 내 알림 목록 조회 (안 읽은 것 우선)
  async getMyAlerts(userId: string) {
    return this.prisma.sysAlert.findMany({
      where: { userId },
      orderBy: [
        { isRead: 'asc' },      // 안 읽은 것 먼저
        { createdAt: 'desc' },  // 최신순
      ],
      take: 20, // 최근 20개만
    });
  }

  // 3. 알림 읽음 처리
  async readAlert(alertId: number) {
    return this.prisma.sysAlert.update({
      where: { id: alertId },
      data: { isRead: true },
    });
  }

  // 4. 안 읽은 알림 개수
  async getUnreadCount(userId: string) {
    return this.prisma.sysAlert.count({
      where: {
        userId,
        isRead: false,
      },
    });
  }
}
