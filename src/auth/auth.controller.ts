// ITM-Data-API/src/auth/auth.controller.ts
import { Controller, Post, Get, Body, Query, Logger } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, SyncUserDto } from './auth.interface';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @Get('ping')
  async ping() {
    return 'pong';
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('guest/login')
  async guestLogin(@Body() loginDto: LoginDto) {
    return this.authService.guestLogin(loginDto);
  }

  // [Backend 연동 엔드포인트]

  @Get('whitelist/check')
  async checkWhitelist(
    @Query('compId') compId?: string,
    @Query('deptId') deptId?: string,
    @Query('username') username?: string, // 테스트용
  ) {
    return this.authService.checkWhitelist(compId, deptId);
  }

  @Post('user/sync')
  async syncUser(@Body() dto: SyncUserDto) {
    return this.authService.syncUser(dto);
  }

  @Get('admin/check')
  async checkAdmin(@Query('loginId') loginId: string) {
    return this.authService.checkAdmin(loginId);
  }

  @Get('guest/check')
  async checkGuest(@Query('loginId') loginId: string) {
    return this.authService.checkGuest(loginId);
  }

  @Get('guest-request/status')
  async getGuestRequestStatus(@Query('loginId') loginId: string) {
    return this.authService.getGuestRequestStatus(loginId);
  }
}
