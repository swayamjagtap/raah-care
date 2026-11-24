import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { HandoversController } from './handovers.controller.js';
import { HandoversService } from './handovers.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [HandoversController],
  providers: [HandoversService],
  exports: [HandoversService],
})
export class HandoversModule {}
