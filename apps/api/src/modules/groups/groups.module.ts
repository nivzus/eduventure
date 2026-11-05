import { Module } from '@nestjs/common';
import { AssignmentsModule } from '../assignments/assignments.module';
import { GroupsController } from './groups.controller';
import { GroupsService } from './groups.service';

@Module({
  imports: [AssignmentsModule],
  controllers: [GroupsController],
  providers: [GroupsService],
})
export class GroupsModule {}
