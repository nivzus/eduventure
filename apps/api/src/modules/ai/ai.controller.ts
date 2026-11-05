import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { Roles } from '../../common/auth/roles.decorator';
import { AiService } from './ai.service';
import { GenerateQuestionsDto } from './dto/ai.dto';

@Roles('TEACHER', 'ADMIN')
@Controller('ai')
export class AiController {
  constructor(private readonly ai: AiService) {}

  /** → BankQuestion-like drafts (not saved). Gemini when GEMINI_API_KEY is set, deterministic mock otherwise. */
  @Post('generate-questions')
  @HttpCode(200)
  generate(@Body() dto: GenerateQuestionsDto) {
    return this.ai.generate(dto);
  }
}
