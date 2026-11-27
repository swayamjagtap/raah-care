import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { CuraCardController } from './cura-card.controller.js';
import { CuraCardService } from './cura-card.service.js';
import { CuraCardUnauthorizedAuditFilter } from './cura-card-audit.filter.js';

@Module({
  imports: [PrismaModule],
  controllers: [CuraCardController],
  providers: [CuraCardService, CuraCardUnauthorizedAuditFilter],
  exports: [CuraCardService],
})
export class CuraCardModule {}
