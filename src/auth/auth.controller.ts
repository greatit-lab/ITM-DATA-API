// ITM-Data-API/src/auth/auth.controller.ts
import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('whitelist/check')
  checkWhitelist(@Query('compId') compId?: string, @Query('deptId') deptId?: string) {
    return this.authService.checkWhitelist(compId, deptId);
  }

  @Post('user/sync')
  syncUser(@Body() body: { loginId: string }) {
    return this.authService.syncUser(body.loginId);
  }

  @Get('admin/check')
  checkAdmin(@Query('loginId') loginId: string) {
    return this.authService.checkAdmin(loginId);
  }

  @Get('guest/check')
  checkGuest(@Query('loginId') loginId: string) {
    return this.authService.checkGuest(loginId);
  }

  @Get('guest-request/status')
  getGuestRequestStatus(@Query('loginId') loginId: string) {
    return this.authService.getGuestRequestStatus(loginId);
  }

  @Get('user/context')
  getUserContext(@Query('loginId') loginId: string) {
    return this.authService.getUserContext(loginId);
  }

  @Post('user/context')
  saveUserContext(@Body() body: { loginId: string; site: string; sdwt: string }) {
    return this.authService.saveUserContext(body.loginId, body.site, body.sdwt);
  }

  @Get('access-codes')
  getAccessCodes() {
    return this.authService.getAccessCodes();
  }

  @Post('guest-request')
  createGuestRequest(@Body() body: any) {
    return this.authService.createGuestRequest(body);
  }
}
