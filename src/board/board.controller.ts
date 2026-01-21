// ITM-Data-API/src/board/board.controller.ts
import { 
  Controller, Get, Post, Body, Query, Param, Delete, Put, 
  ParseIntPipe, UsePipes, ValidationPipe 
} from '@nestjs/common';
import { BoardService } from './board.service';
import { CreatePostDto, CreateCommentDto } from './dto/board.dto';

@Controller('board')
export class BoardController {
  constructor(private readonly boardService: BoardService) {}

  /**
   * 게시글 목록 조회
   * GET /api/board?page=1&limit=10&category=QNA&search=text
   */
  @Get()
  async getPosts(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('category') category = 'ALL',
    @Query('search') search = '',
  ) {
    return this.boardService.getPosts(Number(page), Number(limit), category, search);
  }

  /**
   * 게시글 상세 조회
   * GET /api/board/:id
   */
  @Get(':id')
  async getPost(@Param('id', ParseIntPipe) id: number) {
    return this.boardService.getPostById(id);
  }

  /**
   * 게시글 작성
   * POST /api/board
   */
  @Post()
  @UsePipes(new ValidationPipe())
  async createPost(@Body() createPostDto: CreatePostDto) {
    return this.boardService.createPost(createPostDto);
  }

  /**
   * 게시글 삭제
   * DELETE /api/board/:id
   */
  @Delete(':id')
  async deletePost(@Param('id', ParseIntPipe) id: number) {
    return this.boardService.deletePost(id);
  }

  /**
   * 게시글 상태 변경 (예: OPEN -> ANSWERED)
   * PUT /api/board/:id/status
   * Body: { status: 'ANSWERED' }
   */
  @Put(':id/status')
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: string
  ) {
    return this.boardService.updateStatus(id, status);
  }

  /**
   * 댓글 작성
   * POST /api/board/comment
   */
  @Post('comment')
  @UsePipes(new ValidationPipe())
  async createComment(@Body() createCommentDto: CreateCommentDto) {
    return this.boardService.createComment(createCommentDto);
  }
}
