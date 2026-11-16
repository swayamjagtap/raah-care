import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { EmergenciesController } from './emergencies.controller.js';
import { EmergenciesService } from './emergencies.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [EmergenciesController],
  providers: [EmergenciesService],
  exports: [EmergenciesService],
})
export class EmergenciesModule {}
