import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AmbulancesModule } from './ambulances/ambulances.module.js';
import { AssignmentsModule } from './assignments/assignments.module.js';
import { EmergenciesModule } from './emergencies/emergencies.module.js';
import { HospitalsModule } from './hospitals/hospitals.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AllocationModule } from './allocation/allocation.module.js';
import { HandoversModule } from './handovers/handovers.module.js';
import { PatientsModule } from './patients/patients.module.js';
import { CuraCardModule } from './cura-card/cura-card.module.js';
import { CuraCardUnauthorizedAuditFilter } from './cura-card/cura-card-audit.filter.js';
import { AuthModule, JwtAuthGuard, RolesGuard } from './auth/index.js';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    EmergenciesModule,
    AmbulancesModule,
    AssignmentsModule,
    HospitalsModule,
    AllocationModule,
    HandoversModule,
    PatientsModule,
    CuraCardModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_FILTER,
      useClass: CuraCardUnauthorizedAuditFilter,
    },
  ],
})
export class AppModule {}
