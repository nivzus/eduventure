import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { Roles } from '../../common/auth/roles.decorator';
import { AuthUser } from '../../common/types';
import { Passcode } from '../content/passcode.decorator';
import { DecksService } from './decks.service';
import { CreateDeckDto, DeckQueryDto, ReviewDto, UpdateDeckDto } from './dto/deck.dto';

@Controller('decks')
export class DecksController {
  constructor(private readonly decks: DecksService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query() q: DeckQueryDto) {
    return this.decks.list(user, q);
  }

  @Get(':id')
  detail(@CurrentUser() user: AuthUser, @Param('id') id: string, @Passcode() passcode?: string) {
    return this.decks.detail(user, id, passcode);
  }

  @Get(':id/study')
  study(@CurrentUser() user: AuthUser, @Param('id') id: string, @Passcode() passcode?: string) {
    return this.decks.study(user, id, passcode);
  }

  @Post()
  @Roles('TEACHER', 'ADMIN')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateDeckDto) {
    return this.decks.create(user, dto);
  }

  @Patch(':id')
  @Roles('TEACHER', 'ADMIN')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateDeckDto) {
    return this.decks.update(user, id, dto);
  }

  @Delete(':id')
  @Roles('TEACHER', 'ADMIN')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.decks.remove(user, id);
  }
}

@Controller('flashcards')
export class FlashcardsController {
  constructor(private readonly decks: DecksService) {}

  @Post(':id/review')
  review(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ReviewDto,
    @Passcode() passcode?: string,
  ) {
    return this.decks.review(user, id, dto.grade, passcode);
  }
}
