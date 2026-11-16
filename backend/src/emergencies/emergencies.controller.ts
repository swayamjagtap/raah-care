import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  CreateEmergencyDto,
  QueryEmergenciesDto,
  UpdateEmergencyStatusDto,
} from './dto/index.js';
import { EmergenciesService } from './emergencies.service.js';

@Controller('emergencies')
export class EmergenciesController {
  constructor(private readonly emergenciesService: EmergenciesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateEmergencyDto) {
    return this.emergenciesService.create(dto);
  }

  @Get()
  findAll(@Query() query: QueryEmergenciesDto) {
    return this.emergenciesService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.emergenciesService.findOne(id);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEmergencyStatusDto,
  ) {
    return this.emergenciesService.updateStatus(id, dto);
  }
}
