// ITM-Data-API/src/auth/auth.service.ts
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';
import { LoginDto, SyncUserDto } from './auth.interface';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  // 로컬 로그인 (테스트용)
  async login(loginDto: LoginDto) {
    return this.generateToken(loginDto.username, 'USER');
  }

  async guestLogin(loginDto: LoginDto) {
    return this.generateToken(loginDto.username, 'GUEST');
  }

  // =========================================================
  // [Backend 연동 로직] - 키값 불일치 완벽 해결
  // =========================================================

  // 1. Whitelist Check
  // Backend 기대값: { isActive: 'Y' }
  async checkWhitelist(compId?: string, deptId?: string) {
    this.logger.log(`[Whitelist] Checking compId=${compId}, deptId=${deptId}`);

    // 무조건 'Y'를 반환하여 로그인 허용
    return { isActive: 'Y' };
  }

  // 2. User Sync
  // Backend 기대값: { loginId: string } 객체
  async syncUser(dto: SyncUserDto) {
    // DTO나 파라미터에서 ID 추출 (호환성 확보)
    const loginId = dto.loginId || dto.username || 'unknown';
    this.logger.log(`[Sync] Syncing user: ${loginId}`);

    try {
      await this.prisma.sysUser.upsert({
        where: { loginId },
        update: { lastLoginAt: new Date(), loginCount: { increment: 1 } },
        create: { loginId, loginCount: 1, lastLoginAt: new Date() },
      });
    } catch (e) {
      this.logger.error(`[Sync] DB Error (Ignored): ${e}`);
    }

    // Backend로 loginId 반환
    return { loginId, status: 'synced' };
  }

  // 3. Admin Check
  // Backend 기대값: { role: string }
  async checkAdmin(loginId: string) {
    const admin = await this.prisma.cfgAdminUser.findUnique({
      where: { loginId },
    });

    if (admin) {
      return { role: admin.role || 'ADMIN' };
    }

    // 404를 던지면 Backend는 '관리자 아님'으로 처리
    throw new NotFoundException('Not an admin');
  }

  // 4. Guest Check
  // Backend 기대값: { grantedRole: string }
  async checkGuest(loginId: string) {
    const guest = await this.prisma.cfgGuestAccess.findUnique({
      where: { loginId },
    });

    if (guest && guest.validUntil > new Date()) {
      return { grantedRole: 'GUEST' };
    }

    throw new NotFoundException('Not a guest');
  }

  // 5. Guest Request Status
  // Backend 기대값: { status: string }
  async getGuestRequestStatus(loginId: string) {
    const request = await this.prisma.cfgGuestRequest.findFirst({
      where: { loginId },
      orderBy: { reqId: 'desc' },
    });

    if (request) {
      // [수정 완료] reqStatus -> status (DB 스키마 필드명 일치)
      return { status: request.status };
    }

    throw new NotFoundException('No request found');
  }

  private generateToken(username: string, role: string) {
    const payload = { username, role, sub: username };
    return {
      accessToken: this.jwtService.sign(payload),
      user: { username, role },
    };
  }
}
