// ITM-Data-API/src/auth/auth.service.ts
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

  private getKstDate(): Date {
    const now = new Date();
    return new Date(now.getTime() + 9 * 60 * 60 * 1000);
  }

  async login(loginDto: LoginDto) {
    return this.generateToken(loginDto.username, 'USER');
  }

  async guestLogin(loginDto: LoginDto) {
    return this.generateToken(loginDto.username, 'GUEST');
  }

  // Guest Request
  async createGuestRequest(data: any) {
    const kstNow = this.getKstDate();
    return this.prisma.cfgGuestRequest.create({
      data: {
        loginId: data.loginId,
        deptCode: data.deptCode,
        deptName: data.deptName,
        reason: data.reason,
        status: 'PENDING',
        createdAt: kstNow, 
      },
    });
  }

  async getGuestRequestStatus(loginId: string) {
    const request = await this.prisma.cfgGuestRequest.findFirst({
      where: { loginId },
      orderBy: { reqId: 'desc' },
    });
    if (request) return { status: request.status };
    throw new NotFoundException('No request found');
  }

  // Context Logic
  async getUserContext(loginId: string) {
    if (!loginId) throw new BadRequestException('loginId is required');
    const context = await this.prisma.sysUserContext.findUnique({
      where: { loginId },
      include: { sdwtInfo: true },
    });
    if (!context || !context.sdwtInfo) return null;
    return { site: context.sdwtInfo.site, sdwt: context.sdwtInfo.sdwt };
  }

  async saveUserContext(loginId: string, site: string, sdwtName: string) {
    const sdwtInfo = await this.prisma.refSdwt.findFirst({ where: { site, sdwt: sdwtName } });
    if (!sdwtInfo) throw new NotFoundException(`SDWT info not found`);
    const kstNow = this.getKstDate();
    
    // Ensure User Exists
    const userExists = await this.prisma.sysUser.findUnique({ where: { loginId } });
    if (!userExists) {
        await this.prisma.sysUser.create({
            data: { loginId, loginCount: 1, lastLoginAt: kstNow, createdAt: kstNow }
        });
    }

    await this.prisma.sysUserContext.upsert({
      where: { loginId },
      update: { lastSdwtId: sdwtInfo.id, updatedAt: kstNow },
      create: { loginId, lastSdwtId: sdwtInfo.id, updatedAt: kstNow },
    });
    return { status: 'success', site, sdwt: sdwtName };
  }

  // Whitelist
  async checkWhitelist(compId?: string, deptId?: string) {
    const conditions: any[] = [];
    if (compId) conditions.push({ compid: compId, isActive: 'Y' });
    if (deptId) conditions.push({ deptid: deptId, isActive: 'Y' });
    if (conditions.length === 0) throw new BadRequestException('ID required');
    const access = await this.prisma.refAccessCode.findFirst({ where: { OR: conditions } });
    if (access) return { isActive: 'Y' };
    throw new NotFoundException('Not allowed');
  }

  async syncUser(dto: SyncUserDto) {
    const loginId = dto.loginId || dto.username || 'unknown';
    const kstNow = this.getKstDate();
    try {
      await this.prisma.sysUser.upsert({
        where: { loginId },
        update: { lastLoginAt: kstNow, loginCount: { increment: 1 } },
        create: { loginId, loginCount: 1, lastLoginAt: kstNow, createdAt: kstNow },
      });
    } catch (e) {}
    return { loginId, status: 'synced' };
  }

  async checkAdmin(loginId: string) {
    const admin = await this.prisma.cfgAdminUser.findUnique({ where: { loginId } });
    if (admin) return { role: admin.role || 'ADMIN' };
    throw new NotFoundException('Not an admin');
  }

  // [수정] 로그 추가: DB에서 가져온 날짜 확인
  async checkGuest(loginId: string) {
    const guest = await this.prisma.cfgGuestAccess.findUnique({ where: { loginId } });
    const kstNow = this.getKstDate();

    // >>> 디버깅 로그: DB 조회 결과 확인
    this.logger.log(`[checkGuest] DB Query Result: ${JSON.stringify(guest)}`);
    this.logger.log(`[checkGuest] Time Check: validUntil(${guest?.validUntil}) > now(${kstNow})`);

    if (guest && guest.validUntil > kstNow) {
       const response = { 
         grantedRole: 'GUEST',
         validUntil: guest.validUntil 
       };
       // >>> 디버깅 로그: 리턴값 확인
       this.logger.log(`[checkGuest] Returning: ${JSON.stringify(response)}`);
       return response;
    }
    
    throw new NotFoundException('Not a guest');
  }

  private generateToken(username: string, role: string) {
    const payload = { username, role, sub: username };
    return { accessToken: this.jwtService.sign(payload), user: { username, role } };
  }
}
