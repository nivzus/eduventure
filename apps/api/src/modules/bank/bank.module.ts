import { Module } from '@nestjs/common';
import { QuizzesModule } from '../quizzes/quizzes.module';
import { BankController } from './bank.controller';
import { BankService } from './bank.service';

@Module({
  imports: [QuizzesModule],
  controllers: [BankController],
  providers: [BankService],
})
export class BankModule {}
