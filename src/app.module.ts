// ITM-Data-API/src/app.module.ts
import { Module, NestModule, MiddlewareConsumer, Logger } from '@nestjs/common';
import { PrismaService } from './prisma.service';

// 1. 기존 데이터 API 모듈
import { WaferModule } from './wafer/wafer.module';
import { PreAlignModule } from './prealign/prealign.module';
import { PerformanceModule } from './performance/performance.module';
import { LampLifeModule } from './lamplife/lamplife.module';
import { ErrorModule } from './error/error.module';

// 2. 인증 및 공통 모듈
import { AuthModule } from './auth/auth.module';
import { MenuModule } from './menu/menu.module';
import { FiltersModule } from './filters/filters.module';

// [New] 게시판 및 알림 모듈
import { BoardModule } from './board/board.module';
import { AlertModule } from './alert/alert.module'; // [추가]

// 3. 비즈니스 로직 이관 모듈
import { DashboardModule } from './dashboard/dashboard.module';
import { HealthModule } from './health/health.module';
import { InfraModule } from './infra/infra.module';
import { AdminModule } from './admin/admin.module';
import { EquipmentModule } from './equipment/equipment.module';

@Module({
  imports: [
    // 1. 데이터 모듈
    WaferModule,
    PreAlignModule,
    PerformanceModule,
    LampLifeModule,
    ErrorModule,

    // 2. 인증/공통 모듈
    AuthModule,
    MenuModule,
    FiltersModule,

    // [New] 게시판 및 알림 모듈 등록
    BoardModule,
    AlertModule, // [추가]

    // 3. 비즈니스 모듈
    DashboardModule,
    HealthModule,
    InfraModule,
    AdminModule,
    EquipmentModule,
  ],
  controllers: [],
  providers: [PrismaService],
})
export class AppModule implements NestModule {
  private readonly logger = new Logger('HTTP');

  configure(consumer: MiddlewareConsumer) {
    // 들어오는 모든 요청을 가로채서 로그를 출력하는 미들웨어
    consumer
      .apply((req: any, res: any, next: any) => {
        const { method, originalUrl } = req;
        const start = Date.now();

        // [디버깅] 요청 도착 로그
        this.logger.log(`📥 Incoming Request: ${method} ${originalUrl}`);

        res.on('finish', () => {
          const { statusCode } = res;
          const duration = Date.now() - start;
          // [디버깅] 응답 완료 로그
          this.logger.log(
            `📤 Response: ${method} ${originalUrl} ${statusCode} - ${duration}ms`,
          );
        });

        next();
      })
      .forRoutes('*'); // 모든 라우트에 적용
  }
}
