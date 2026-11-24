import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AllocationController } from './allocation.controller.js';
import { AllocationService } from './allocation.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [AllocationController],
  providers: [AllocationService],
  exports: [AllocationService],
})
export class AllocationModule {}
