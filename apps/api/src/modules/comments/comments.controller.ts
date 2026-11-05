import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { AuthUser } from '../../common/types';
import { CommentsService } from './comments.service';
import { CommentQueryDto, CreateCommentDto } from './dto/comment.dto';

@Controller('comments')
export class CommentsController {
  constructor(private readonly comments: CommentsService) {}

  /** Threaded: top-level comments (oldest first) each with nested `replies`. */
  @Get()
  list(@CurrentUser() user: AuthUser, @Query() q: CommentQueryDto) {
    return this.comments.list(user, q);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateCommentDto) {
    return this.comments.create(user, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.comments.remove(user, id);
  }
}
