import { Global, Module } from '@nestjs/common';
import { ContentController } from './content.controller';
import { ContentService } from './content.service';

/** Visibility / permissions / unlock endpoints + shared content helpers (summaries, lock flags). */
@Global()
@Module({
  controllers: [ContentController],
  providers: [ContentService],
  exports: [ContentService],
})
export class ContentModule {}
