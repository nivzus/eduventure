import { Controller, Get, Query } from '@nestjs/common';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { AuthUser } from '../../common/types';
import { SearchService } from './search.service';

@Controller('search')
export class SearchController {
  constructor(private readonly search: SearchService) {}

  /** `{quizzes, articles, courses, paths, decks}` — max 5 each, visibility-filtered. */
  @Get()
  find(@CurrentUser() user: AuthUser, @Query('q') q?: string) {
    return this.search.search(user, q);
  }
}
