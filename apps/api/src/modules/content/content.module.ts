import { Global, Module } from '@nestjs/common';
import { ContentController } from './content.controller';
import { ContentService } from './content.service';
import { ProgressService } from './progress.service';

/**
 * Visibility / permissions / unlock endpoints + shared content helpers
 * (summaries, lock flags, per-user learning progress). Global so feature modules can inject them.
 */
@Global()
@Module({
  controllers: [ContentController],
  providers: [ContentService, ProgressService],
  exports: [ContentService, ProgressService],
})
export class ContentModule {}
