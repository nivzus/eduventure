import { Global, Module } from '@nestjs/common';
import { AttemptsModule } from '../attempts/attempts.module';
import { PracticeController } from './practice.controller';
import { PracticeService } from './practice.service';

/** Global so users/stats can reuse PracticeService.weakTopics(). */
@Global()
@Module({
  imports: [AttemptsModule],
  controllers: [PracticeController],
  providers: [PracticeService],
  exports: [PracticeService],
})
export class PracticeModule {}
