import { Module } from '@nestjs/common';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';

/** Teacher/admin analytics. PracticeService comes from the global PracticeModule. */
@Module({
  controllers: [StatsController],
  providers: [StatsService],
})
export class StatsModule {}
