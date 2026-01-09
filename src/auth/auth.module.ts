// ITM-Data-API/src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy'; // [확인] 경로 일치
import { PrismaService } from '../prisma.service';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'secretKey', // 환경 변수 사용 권장
      signOptions: { expiresIn: '60m' }, // 토큰 만료 시간 (60분)
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService, 
    PrismaService, 
    JwtStrategy // [중요] Strategy 등록
  ],
  exports: [AuthService], // 다른 모듈에서 AuthService 사용 가능하도록 export
})
export class AuthModule {}
