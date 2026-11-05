import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { Roles } from '../../common/auth/roles.decorator';
import { AuthUser } from '../../common/types';
import { Passcode } from '../content/passcode.decorator';
import { ArticlesService } from './articles.service';
import {
  ArticleProgressDto,
  ArticleQueryDto,
  CreateAnnotationDto,
  CreateArticleDto,
  UpdateAnnotationDto,
  UpdateArticleDto,
} from './dto/article.dto';

@Controller('articles')
export class ArticlesController {
  constructor(private readonly articles: ArticlesService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query() q: ArticleQueryDto) {
    return this.articles.list(user, q);
  }

  /** Distinct categories of visible articles (extra helper, mirrors /quizzes/categories). */
  @Get('categories')
  categories(@CurrentUser() user: AuthUser) {
    return this.articles.categories(user);
  }

  @Get(':slugOrId')
  detail(@CurrentUser() user: AuthUser, @Param('slugOrId') slugOrId: string, @Passcode() passcode?: string) {
    return this.articles.detail(user, slugOrId, passcode);
  }

  @Post()
  @Roles('TEACHER', 'ADMIN')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateArticleDto) {
    return this.articles.create(user, dto);
  }

  @Patch(':id')
  @Roles('TEACHER', 'ADMIN')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateArticleDto) {
    return this.articles.update(user, id, dto);
  }

  @Delete(':id')
  @Roles('TEACHER', 'ADMIN')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.articles.remove(user, id);
  }

  @Put(':id/progress')
  progress(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ArticleProgressDto,
    @Passcode() passcode?: string,
  ) {
    return this.articles.setProgress(user, id, dto.progress, passcode);
  }

  @Get(':id/annotations')
  annotations(@CurrentUser() user: AuthUser, @Param('id') id: string, @Passcode() passcode?: string) {
    return this.articles.annotations(user, id, passcode);
  }

  @Post(':id/annotations')
  createAnnotation(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CreateAnnotationDto,
    @Passcode() passcode?: string,
  ) {
    return this.articles.createAnnotation(user, id, dto, passcode);
  }
}

@Controller('annotations')
export class AnnotationsController {
  constructor(private readonly articles: ArticlesService) {}

  @Patch(':id')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateAnnotationDto) {
    return this.articles.updateAnnotation(user, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.articles.deleteAnnotation(user, id);
  }
}
