// ITM-Data-API/src/auth/auth.interface.ts

export class LoginDto {
  username!: string;
  password?: string;
}

export class SyncUserDto {
  loginId?: string; // Backend가 주로 보냄
  username?: string;
  deptName?: string;
  [key: string]: any; // 그 외 어떤 필드가 와도 허용 (에러 방지)
}

export interface UserPayload {
  username: string;
  role: string;
  sub?: string;
}
