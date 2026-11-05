import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { Roles } from '../../common/auth/roles.decorator';
import { AuthUser } from '../../common/types';
import { BankService } from './bank.service';
import { BankBulkDto, BankListQueryDto, BankToQuizDto, CreateBankQuestionDto, UpdateBankQuestionDto } from './dto/bank.dto';

@Roles('TEACHER', 'ADMIN')
@Controller('bank')
export class BankController {
  constructor(private readonly bank: BankService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query() query: BankListQueryDto) {
    return this.bank.list(user, query);
  }

  @Get('tags')
  tags() {
    return this.bank.tags();
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateBankQuestionDto) {
    return this.bank.create(user, dto);
  }

  /** Extension: save many drafts at once (e.g. AI output). */
  @Post('bulk')
  bulk(@CurrentUser() user: AuthUser, @Body() dto: BankBulkDto) {
    return this.bank.bulkCreate(user, dto.questions);
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 2 * 1024 * 1024 } }))
  import(@CurrentUser() user: AuthUser, @UploadedFile() file: Express.Multer.File) {
    return this.bank.importCsv(user, file);
  }

  @Post('to-quiz')
  toQuiz(@CurrentUser() user: AuthUser, @Body() dto: BankToQuizDto) {
    return this.bank.toQuiz(user, dto.questionIds, dto.quizId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @CurrentUser() user: AuthUser, @Body() dto: UpdateBankQuestionDto) {
    return this.bank.update(id, user, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.bank.remove(id, user);
  }
}
