import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { Public } from '../../common/auth/public.decorator';
import { Roles } from '../../common/auth/roles.decorator';
import { AuthUser } from '../../common/types';
import { CreateQuizDto, QuizListQueryDto, UpdateQuizDto } from './dto/quiz.dto';
import { QuizzesService } from './quizzes.service';

@Controller('quizzes')
export class QuizzesController {
  constructor(private readonly quizzes: QuizzesService) {}

  @Public()
  @Get()
  list(@CurrentUser() user: AuthUser | undefined, @Query() query: QuizListQueryDto) {
    return this.quizzes.list(user, query);
  }

  @Public()
  @Get('categories')
  categories(@CurrentUser() user: AuthUser | undefined) {
    return this.quizzes.categories(user);
  }

  @Public()
  @Get(':id')
  get(@Param('id') id: string, @CurrentUser() user: AuthUser | undefined) {
    return this.quizzes.get(id, user);
  }

  @Roles('TEACHER', 'ADMIN')
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateQuizDto) {
    return this.quizzes.create(user, dto);
  }

  @Roles('TEACHER', 'ADMIN')
  @Patch(':id')
  update(@Param('id') id: string, @CurrentUser() user: AuthUser, @Body() dto: UpdateQuizDto) {
    return this.quizzes.update(id, user, dto);
  }

  @Roles('TEACHER', 'ADMIN')
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.quizzes.remove(id, user);
  }

  @Roles('TEACHER', 'ADMIN')
  @Post(':id/clone')
  clone(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.quizzes.clone(id, user);
  }

  @Roles('TEACHER', 'ADMIN')
  @Post(':id/import')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 2 * 1024 * 1024 } }))
  import(@Param('id') id: string, @CurrentUser() user: AuthUser, @UploadedFile() file: Express.Multer.File) {
    return this.quizzes.importCsv(id, user, file);
  }
}
