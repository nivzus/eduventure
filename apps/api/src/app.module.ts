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

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CommonModule,
    NotificationsModule,
    GamificationModule,
    AuthModule,
    // ── API-CORE modules ──
    // ── API-CONTENT modules ──
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
