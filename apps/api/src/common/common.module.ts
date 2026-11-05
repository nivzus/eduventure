import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AccessService } from './access/access.service';
import { PrismaService } from './prisma/prisma.service';

/** Global: PrismaService, AccessService, JwtService (secrets passed per call). */
@Global()
@Module({
  imports: [JwtModule.register({ global: true })],
  providers: [PrismaService, AccessService],
  exports: [PrismaService, AccessService, JwtModule],
})
export class CommonModule {}
