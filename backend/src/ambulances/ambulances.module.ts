import { Module } from '@nestjs/common';
import { AmbulancesController } from './ambulances.controller.js';
import { AmbulancesService } from './ambulances.service.js';

@Module({
  controllers: [AmbulancesController],
  providers: [AmbulancesService],
  exports: [AmbulancesService],
})
export class AmbulancesModule {}
