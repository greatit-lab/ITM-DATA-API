// ITM-Data-API/src/board/board.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreatePostDto, CreateCommentDto } from './dto/board.dto';

@Injectable()
export class BoardService {
  constructor(private prisma: PrismaService) {}

  // 1. 게시글 목록 조회 (검색 및 페이징 포함)
  async getPosts(page: number, limit: number, category?: string, search?: string) {
    const skip = (page - 1) * limit;
    
    // 검색 조건 구성
    const whereCondition: any = {};
    if (category && category !== 'ALL') {
      whereCondition.category = category;
    }
    if (search) {
      whereCondition.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } }, // 내용 검색 추가
        { authorId: { contains: search, mode: 'insensitive' } },
      ];
    }

    // 데이터 조회
    const [total, posts] = await Promise.all([
      this.prisma.sysBoard.count({ where: whereCondition }),
      this.prisma.sysBoard.findMany({
        where: whereCondition,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { comments: true } }, // 댓글 수 포함
        },
      }),
    ]);

    return {
      data: posts,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit),
      },
    };
  }

  // 2. 게시글 상세 조회
  async getPostById(postId: number) {
    const post = await this.prisma.sysBoard.findUnique({
      where: { postId },
      include: {
        comments: {
          orderBy: { createdAt: 'asc' }, // 댓글은 작성순
        },
        files: true, // 첨부 파일 포함
      },
    });

    if (!post) throw new NotFoundException(`Post #${postId} not found`);

    // 조회수 증가 (비동기 처리)
    await this.prisma.sysBoard.update({
      where: { postId },
      data: { views: { increment: 1 } },
    });

    return post;
  }

  // 3. 게시글 작성
  async createPost(data: CreatePostDto) {
    return this.prisma.sysBoard.create({
      data: {
        title: data.title,
        content: data.content,
        authorId: data.authorId,
        category: data.category || 'QNA',
        isSecret: data.isSecret || 'N',
      },
    });
  }

  // 4. 게시글 상태 변경 (답변완료 처리 등)
  async updateStatus(postId: number, status: string) {
    return this.prisma.sysBoard.update({
      where: { postId },
      data: { status },
    });
  }

  // 5. 게시글 삭제
  async deletePost(postId: number) {
    return this.prisma.sysBoard.delete({
      where: { postId },
    });
  }

  // 6. 댓글 작성
  async createComment(data: CreateCommentDto) {
    // 댓글 작성 시 자동으로 게시글 상태를 'ANSWERED'로 변경할지 여부는 정책에 따라 결정
    // 여기서는 단순히 댓글만 추가
    return this.prisma.sysBoardComment.create({
      data: {
        postId: Number(data.postId),
        authorId: data.authorId,
        content: data.content,
        parentId: data.parentId ? Number(data.parentId) : null,
      },
    });
  }
}
