import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AmbulancesModule } from './ambulances/ambulances.module.js';
import { AssignmentsModule } from './assignments/assignments.module.js';
import { EmergenciesModule } from './emergencies/emergencies.module.js';
import { HospitalsModule } from './hospitals/hospitals.module.js';
import { PrismaModule } from './prisma/prisma.module.js';

@Module({
  imports: [
    PrismaModule,
    EmergenciesModule,
    AmbulancesModule,
    AssignmentsModule,
    HospitalsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
