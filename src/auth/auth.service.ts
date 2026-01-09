// ITM-Data-API/src/auth/auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';
import { LoginDto } from './auth.interface';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  // 1. 로그인 (AD 연동 전 임시 로직 또는 DB 기반 로그인)
  async login(loginDto: LoginDto) {
    const { username, password } = loginDto;

    // [TODO] 실제 AD 인증 로직으로 교체 필요
    // 현재는 DB의 sys_user 테이블이나 하드코딩된 로직을 사용할 수 있음
    // 여기서는 간단히 사용자 존재 여부만 체크하고 토큰 발급 (개발용)
    
    // 예시: 관리자 계정 하드코딩
    if (username === 'admin' && password === 'admin') {
      return this.generateToken(username, 'ADMIN');
    }

    // DB 사용자 조회 (비밀번호 검증 로직 추가 필요)
    const user = await this.prisma.sysUser.findUnique({
      where: { loginId: username },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // [TODO] 비밀번호 해시 비교 로직 추가
    // if (!bcrypt.compare(password, user.password)) ...

    // 권한 조회 (Admin 테이블 확인)
    const adminUser = await this.prisma.cfgAdminUser.findUnique({
      where: { loginId: username },
    });

    const role = adminUser ? adminUser.role : 'USER';

    return this.generateToken(username, role);
  }

  // 2. 토큰 생성
  private generateToken(username: string, role: string) {
    const payload = { username, role };
    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        username,
        role,
      },
    };
  }

  // 3. 게스트 로그인 (요청 승인 여부 확인)
  async guestLogin(loginDto: LoginDto) {
    const { username } = loginDto;

    const guestAccess = await this.prisma.cfgGuestAccess.findUnique({
      where: { loginId: username },
    });

    if (!guestAccess) {
      throw new UnauthorizedException('Guest access not granted or expired');
    }

    if (guestAccess.validUntil < new Date()) {
      throw new UnauthorizedException('Guest access expired');
    }

    return this.generateToken(username, 'GUEST');
  }
}
