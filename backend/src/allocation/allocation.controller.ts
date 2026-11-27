import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
} from '@nestjs/common';
import { Roles } from '../auth/index.js';
import { UserRole } from '../../generated/prisma/enums.js';
import { AllocationService } from './allocation.service.js';
import {
  QueryAmbulanceRecommendationsDto,
  QueryHospitalRecommendationsDto,
  SelectDestinationDto,
} from './dto/index.js';

@Controller('emergencies')
export class AllocationController {
  constructor(private readonly allocationService: AllocationService) {}

  @Roles(UserRole.DISPATCHER, UserRole.SYSTEM_ADMIN)
  @Get(':id/ambulance-recommendations')
  getAmbulanceRecommendations(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: QueryAmbulanceRecommendationsDto,
  ) {
    return this.allocationService.getAmbulanceRecommendations(id, query);
  }

  @Roles(UserRole.DISPATCHER, UserRole.SYSTEM_ADMIN)
  @Get(':id/hospital-recommendations')
  getHospitalRecommendations(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: QueryHospitalRecommendationsDto,
  ) {
    return this.allocationService.getHospitalRecommendations(id, query);
  }

  @Roles(UserRole.DISPATCHER, UserRole.SYSTEM_ADMIN)
  @Patch(':id/destination')
  selectDestination(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SelectDestinationDto,
  ) {
    return this.allocationService.selectDestination(id, dto);
  }
}
