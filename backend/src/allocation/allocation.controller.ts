import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
} from '@nestjs/common';
import { AllocationService } from './allocation.service.js';
import {
  QueryAmbulanceRecommendationsDto,
  QueryHospitalRecommendationsDto,
  SelectDestinationDto,
} from './dto/index.js';

@Controller('emergencies')
export class AllocationController {
  constructor(private readonly allocationService: AllocationService) {}

  @Get(':id/ambulance-recommendations')
  getAmbulanceRecommendations(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: QueryAmbulanceRecommendationsDto,
  ) {
    return this.allocationService.getAmbulanceRecommendations(id, query);
  }

  @Get(':id/hospital-recommendations')
  getHospitalRecommendations(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: QueryHospitalRecommendationsDto,
  ) {
    return this.allocationService.getHospitalRecommendations(id, query);
  }

  @Patch(':id/destination')
  selectDestination(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SelectDestinationDto,
  ) {
    return this.allocationService.selectDestination(id, dto);
  }
}
