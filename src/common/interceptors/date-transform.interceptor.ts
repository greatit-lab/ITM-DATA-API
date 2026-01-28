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

    // 1. Date 객체인 경우: 포맷팅된 문자열로 변환 (25-01-28 14:30:05)
    if (value instanceof Date) {
      return dayjs(value).format('YY-MM-DD HH:mm:ss');
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

    // 그 외(숫자, 문자열 등)는 그대로 반환
    return value;
  }
}
