import { Module } from '@nestjs/common';
import { AnnotationsController, ArticlesController } from './articles.controller';
import { ArticlesService } from './articles.service';

@Module({
  controllers: [ArticlesController, AnnotationsController],
  providers: [ArticlesService],
  exports: [ArticlesService],
})
export class ArticlesModule {}
