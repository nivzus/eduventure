import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './common/auth/jwt-auth.guard';
import { RolesGuard } from './common/auth/roles.guard';
import { CommonModule } from './common/common.module';
import { HealthController } from './health.controller';
import { AuthModule } from './modules/auth/auth.module';
import { GamificationModule } from './modules/gamification/gamification.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
// ── API-CONTENT modules: add imports below this line ──
import { UsersModule } from './modules/users/users.module';
import { QuizzesModule } from './modules/quizzes/quizzes.module';
import { AttemptsModule } from './modules/attempts/attempts.module';
import { PracticeModule } from './modules/practice/practice.module';
import { BankModule } from './modules/bank/bank.module';
import { AiModule } from './modules/ai/ai.module';
import { ArticlesModule } from './modules/articles/articles.module';
import { AssignmentsModule } from './modules/assignments/assignments.module';
import { BookmarksModule } from './modules/bookmarks/bookmarks.module';
import { CommentsModule } from './modules/comments/comments.module';
import { ContentModule } from './modules/content/content.module';
import { CoursesModule } from './modules/courses/courses.module';
import { DecksModule } from './modules/decks/decks.module';
import { GroupsModule } from './modules/groups/groups.module';
import { PathsModule } from './modules/paths/paths.module';
import { SearchModule } from './modules/search/search.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CommonModule,
    NotificationsModule,
    GamificationModule,
    AuthModule,
    // ── API-CORE modules ──
    UsersModule,
    QuizzesModule,
    AttemptsModule,
    PracticeModule,
    BankModule,
    AiModule,
    // ── API-CONTENT modules ──
    ContentModule,
    ArticlesModule,
    CoursesModule,
    PathsModule,
    DecksModule,
    GroupsModule,
    AssignmentsModule,
    CommentsModule,
    BookmarksModule,
    SearchModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
