import { Module } from '@nestjs/common';
import { DecksController, FlashcardsController } from './decks.controller';
import { DecksService } from './decks.service';

@Module({
  controllers: [DecksController, FlashcardsController],
  providers: [DecksService],
})
export class DecksModule {}
