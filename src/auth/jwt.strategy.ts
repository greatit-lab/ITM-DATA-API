// ITM-Data-API/src/auth/jwt.strategy.ts
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      // Request Header의 Bearer Token에서 JWT 추출
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false, // 만료된 토큰 거부
      secretOrKey: process.env.JWT_SECRET || 'secretKey', // .env의 비밀키 사용
    });
  }

  // 토큰 검증 성공 시 실행 -> request.user에 반환값 저장됨
  async validate(payload: any) {
    return { 
      userId: payload.sub, 
      username: payload.username, 
      role: payload.role 
    };
  }
}
