import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MeController, UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [AuthModule],
  controllers: [MeController, UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
