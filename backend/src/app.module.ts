import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { EmergenciesModule } from './emergencies/emergencies.module.js';
import { PrismaModule } from './prisma/prisma.module.js';

@Module({
  imports: [PrismaModule, EmergenciesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
