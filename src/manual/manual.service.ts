// ITM-Data-API/src/manual/manual.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class ManualService {
  constructor(private prisma: PrismaService) {}

  // [GET] 전체 매뉴얼 목록 조회 (정렬 순서대로)
  async findAll() {
    return this.prisma.sysManual.findMany({
      orderBy: { sortOrder: 'asc' },
    });
  }

  // [PUT] 매뉴얼 데이터 일괄 저장 (Transaction 처리)
  async saveAll(sections: any[]) {
    // 트랜잭션: 도중에 에러 발생 시 전체 롤백
    return this.prisma.$transaction(async (tx) => {
      // 1. 기존 데이터 초기화 (편집된 전체 리스트로 덮어쓰기 위해 삭제)
      // 주의: 운영 정책에 따라 삭제 대신 ID 비교 후 Update/Insert(Upsert)로 변경 가능
      await tx.sysManual.deleteMany();

      // 2. 새 데이터 삽입
      // 클라이언트에서 보낸 배열의 순서(index)를 sortOrder로 저장
      for (const [index, section] of sections.entries()) {
        await tx.sysManual.create({
          data: {
            id: section.id,
            title: section.title,
            subtitle: section.subtitle,
            icon: section.icon,
            content: section.content,
            imageUrl: section.imageUrl,
            sortOrder: index, // 배열 인덱스를 정렬 순서로 사용
          },
        });
      }
    });
  }
}
