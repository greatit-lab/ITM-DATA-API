// ITM-Data-API/src/board/board.service.ts
import { Injectable, NotFoundException, Logger, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreatePostDto, CreateCommentDto } from './dto/board.dto';

@Injectable()
export class BoardService {
  private readonly logger = new Logger(BoardService.name);

  constructor(private prisma: PrismaService) {}

  // 1. 게시글 목록 조회 (검색 및 페이징 포함)
  async getPosts(page: number, limit: number, category?: string, search?: string) {
    try {
      const skip = (page - 1) * limit;
      
      const whereCondition: any = {};
      if (category && category !== 'ALL') {
        whereCondition.category = category;
      }
      if (search) {
        whereCondition.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { content: { contains: search, mode: 'insensitive' } },
          { authorId: { contains: search, mode: 'insensitive' } },
        ];
      }

      // 1. 게시글 데이터 조회 (author 관계 사용)
      const [total, posts] = await Promise.all([
        this.prisma.sysBoard.count({ where: whereCondition }),
        this.prisma.sysBoard.findMany({
          where: whereCondition,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            _count: { select: { comments: true } },
            author: true, // [수정] user -> author (Schema 관계명 일치)
          },
        }),
      ]);

      // 2. 작성자들의 권한(Role) 정보 조회 (CfgAdminUser 테이블)
      // 게시글 작성자 ID 목록 추출
      const authorIds = [...new Set(posts.map(p => p.authorId))];
      
      // 관리자 테이블에서 해당 ID들의 권한 조회
      const adminUsers = await this.prisma.cfgAdminUser.findMany({
        where: { loginId: { in: authorIds } },
        select: { loginId: true, role: true }
      });

      // ID별 권한 맵 생성
      const roleMap = new Map(adminUsers.map(u => [u.loginId, u.role]));

      // 3. 데이터 병합 (Frontend가 post.user.role로 접근 가능하도록 구조 변환)
      const mappedPosts = posts.map(post => ({
        ...post,
        user: { // Frontend 호환성을 위한 가상 객체
          ...post.author,
          role: roleMap.get(post.authorId) || 'USER' // 관리자 아니면 USER
        }
      }));

      return {
        data: mappedPosts,
        meta: {
          total,
          page,
          lastPage: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      this.logger.error(`Failed to getPosts: ${error.message}`, error.stack);
      throw new InternalServerErrorException('게시글 목록을 불러오는 중 오류가 발생했습니다.');
    }
  }

  // 2. 게시글 상세 조회
  async getPostById(postId: number) {
    try {
      const post = await this.prisma.sysBoard.findUnique({
        where: { postId },
        include: {
          author: true, // [수정] user -> author
          comments: {
            orderBy: { createdAt: 'asc' },
            include: {
              author: true // [수정] user -> author
            }
          },
          files: true,
        },
      });

      if (!post) throw new NotFoundException(`Post #${postId} not found`);

      // 조회수 증가
      this.prisma.sysBoard.update({
        where: { postId },
        data: { views: { increment: 1 } },
      }).catch(e => this.logger.warn(`Failed to update views: ${e.message}`));

      // 권한 정보 조회 (게시글 작성자 + 댓글 작성자들)
      const userIds = new Set<string>();
      userIds.add(post.authorId);
      post.comments.forEach(c => userIds.add(c.authorId));

      const adminUsers = await this.prisma.cfgAdminUser.findMany({
        where: { loginId: { in: [...userIds] } },
        select: { loginId: true, role: true }
      });
      const roleMap = new Map(adminUsers.map(u => [u.loginId, u.role]));

      // 데이터 병합 및 구조 변환
      const mappedPost = {
        ...post,
        user: { // 게시글 작성자 권한
          ...post.author,
          role: roleMap.get(post.authorId) || 'USER'
        },
        comments: post.comments.map(comment => ({
          ...comment,
          user: { // 댓글 작성자 권한
            ...comment.author,
            role: roleMap.get(comment.authorId) || 'USER'
          }
        }))
      };

      return mappedPost;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(`Failed to getPostById(${postId}): ${error.message}`, error.stack);
      throw new InternalServerErrorException('게시글 상세 정보를 불러오는 중 오류가 발생했습니다.');
    }
  }

  // 3. 게시글 작성
  async createPost(data: CreatePostDto) {
    try {
      return await this.prisma.sysBoard.create({
        data: {
          title: data.title,
          content: data.content,
          authorId: data.authorId,
          category: data.category || 'QNA',
          isSecret: data.isSecret || 'N',
        },
      });
    } catch (error) {
      this.logger.error(`Failed to createPost: ${error.message}`, error.stack);
      throw new InternalServerErrorException('게시글 작성 중 오류가 발생했습니다.');
    }
  }

  // 4. 게시글 수정
  async updatePost(postId: number, data: any) {
    try {
      return await this.prisma.sysBoard.update({
        where: { postId },
        data: {
          title: data.title,
          content: data.content,
          category: data.category,
          isSecret: data.isSecret,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to updatePost: ${error.message}`, error.stack);
      throw new InternalServerErrorException('게시글 수정 중 오류가 발생했습니다.');
    }
  }

  // 5. 게시글 상태 변경
  async updateStatus(postId: number, status: string) {
    try {
      return await this.prisma.sysBoard.update({
        where: { postId },
        data: { status },
      });
    } catch (error) {
      this.logger.error(`Failed to updateStatus: ${error.message}`, error.stack);
      throw new InternalServerErrorException('상태 변경 중 오류가 발생했습니다.');
    }
  }

  // 6. 게시글 삭제
  async deletePost(postId: number) {
    try {
      return await this.prisma.$transaction([
        this.prisma.sysBoardComment.deleteMany({ where: { postId } }),
        this.prisma.sysBoard.delete({ where: { postId } }),
      ]);
    } catch (error) {
      this.logger.error(`Failed to deletePost: ${error.message}`, error.stack);
      throw new InternalServerErrorException('게시글 삭제 중 오류가 발생했습니다.');
    }
  }

  // 7. 댓글 작성
  async createComment(data: CreateCommentDto) {
    try {
      return await this.prisma.sysBoardComment.create({
        data: {
          postId: Number(data.postId),
          authorId: data.authorId,
          content: data.content,
          parentId: data.parentId ? Number(data.parentId) : null,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to createComment: ${error.message}`, error.stack);
      throw new InternalServerErrorException('댓글 작성 중 오류가 발생했습니다.');
    }
  }
}
