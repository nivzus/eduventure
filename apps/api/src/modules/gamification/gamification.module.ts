import { Global, Module } from '@nestjs/common';
import { AdminGamificationController, GamificationController } from './gamification.controller';
import { GamificationQueryService } from './gamification-query.service';
import { GamificationService } from './gamification.service';

@Global()
@Module({
  controllers: [GamificationController, AdminGamificationController],
  providers: [GamificationService, GamificationQueryService],
  exports: [GamificationService, GamificationQueryService],
})
export class GamificationModule {}
