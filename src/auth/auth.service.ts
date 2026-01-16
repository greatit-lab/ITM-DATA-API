// [전체 코드 교체] ITM-Data-API/src/auth/auth.service.ts
import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
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

  async login(loginDto: LoginDto) {
    return this.generateToken(loginDto.username, 'USER');
  }

  async guestLogin(loginDto: LoginDto) {
    return this.generateToken(loginDto.username, 'GUEST');
  }

  // =========================================================
  // [Context Logic] - DB 연동
  // =========================================================

  async getUserContext(loginId: string) {
    if (!loginId) {
      this.logger.error('[getUserContext] loginId is missing');
      throw new BadRequestException('loginId is required');
    }

    this.logger.log(`[DB Query] Finding context for loginId: ${loginId}`);

    const context = await this.prisma.sysUserContext.findUnique({
      where: { loginId },
      include: {
        sdwtInfo: true, 
      },
    });

    if (!context) {
      this.logger.warn(`[DB Result] No SysUserContext found for loginId: ${loginId}`);
      return null;
    }

    if (!context.sdwtInfo) {
      this.logger.warn(`[DB Result] Context found but 'sdwtInfo' (Join) is null. lastSdwtId: ${context.lastSdwtId}`);
      return null;
    }

    const result = {
      site: context.sdwtInfo.site,
      sdwt: context.sdwtInfo.sdwt,
    };

    this.logger.log(`[DB Result] Success. Returning: ${JSON.stringify(result)}`);
    return result;
  }

  async saveUserContext(loginId: string, site: string, sdwtName: string) {
    this.logger.log(`[saveUserContext] Searching RefSdwt for Site: ${site}, Name: ${sdwtName}`);

    // 1. RefSdwt ID 조회
    const sdwtInfo = await this.prisma.refSdwt.findFirst({
      where: {
        site: site,
        sdwt: sdwtName,
      },
    });

    if (!sdwtInfo) {
      this.logger.error(`[saveUserContext] SDWT Info not found in DB.`);
      throw new NotFoundException(`SDWT info not found for Site: ${site}, Name: ${sdwtName}`);
    }

    // 2. SysUser 존재 여부 확인 (없으면 생성)
    const userExists = await this.prisma.sysUser.findUnique({ where: { loginId } });
    if (!userExists) {
        this.logger.log(`[saveUserContext] Creating SysUser for safety.`);
        await this.prisma.sysUser.create({
            data: { loginId, loginCount: 1, lastLoginAt: new Date() }
        });
    }

    // [수정] KST 시간 계산 (현재 시간 + 9시간)
    // DB 세션 타임존 설정이 UTC로 되어있어도 한국 시간 값으로 저장되도록 오프셋 적용
    const now = new Date();
    const kstDate = new Date(now.getTime() + 9 * 60 * 60 * 1000);

    this.logger.log(`[saveUserContext] Saving with KST Time: ${kstDate.toISOString()}`);

    // 3. SysUserContext 저장 (updatedAt에 KST 적용)
    await this.prisma.sysUserContext.upsert({
      where: { loginId },
      update: {
        lastSdwtId: sdwtInfo.id,
        updatedAt: kstDate, // 수정 시 KST 저장
      },
      create: {
        loginId,
        lastSdwtId: sdwtInfo.id,
        updatedAt: kstDate, // 생성 시 KST 저장
      },
    });

    this.logger.log(`[saveUserContext] Successfully saved.`);
    return { status: 'success', site, sdwt: sdwtName };
  }

  // =========================================================
  // [Backend 연동 로직]
  // =========================================================

  async checkWhitelist(compId?: string, deptId?: string) {
    this.logger.log(`[Whitelist] Checking compId=${compId}, deptId=${deptId}`);
    return { isActive: 'Y' };
  }

  async syncUser(dto: SyncUserDto) {
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
    return { loginId, status: 'synced' };
  }

  async checkAdmin(loginId: string) {
    const admin = await this.prisma.cfgAdminUser.findUnique({ where: { loginId } });
    if (admin) return { role: admin.role || 'ADMIN' };
    throw new NotFoundException('Not an admin');
  }

  async checkGuest(loginId: string) {
    const guest = await this.prisma.cfgGuestAccess.findUnique({ where: { loginId } });
    if (guest && guest.validUntil > new Date()) return { grantedRole: 'GUEST' };
    throw new NotFoundException('Not a guest');
  }

  async getGuestRequestStatus(loginId: string) {
    const request = await this.prisma.cfgGuestRequest.findFirst({
      where: { loginId },
      orderBy: { reqId: 'desc' },
    });
    if (request) return { status: request.status };
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
