// ITM-Data-API/src/common/interceptors/date-transform.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc'; 

// [설정] UTC 모드 활성화
dayjs.extend(utc);

@Injectable()
export class DateTransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      map((data) => this.transformDate(data)),
    );
  }

  private transformDate(value: unknown): any {
    if (value === null || value === undefined) {
      return value;
    }

    // 1. Date 객체인 경우: 표준 포맷(YYYY) 문자열로 변환
    if (value instanceof Date) {
      // [핵심 수정] 'YY' -> 'YYYY'로 변경 (26-01-28 -> 2026-01-28)
      return dayjs(value).utc().format('YYYY-MM-DD HH:mm:ss');
    }

    // 2. 배열인 경우: 내부 아이템 재귀 변환
    if (Array.isArray(value)) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return value.map((item) => this.transformDate(item));
    }

    // 3. 객체인 경우: 속성값 재귀 변환
    if (typeof value === 'object') {
      const result: Record<string, any> = {};
      const record = value as Record<string, unknown>;

      for (const key of Object.keys(record)) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        result[key] = this.transformDate(record[key]);
      }
      return result;
    }

    return value;
  }
}
