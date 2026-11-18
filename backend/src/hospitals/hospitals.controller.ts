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
  CreateHospitalDto,
  CreateHospitalResourceDto,
  QueryHospitalsDto,
  UpdateHospitalDto,
  UpdateHospitalResourceDto,
} from './dto/index.js';
import { HospitalsService } from './hospitals.service.js';

@Controller('hospitals')
export class HospitalsController {
  constructor(private readonly hospitalsService: HospitalsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateHospitalDto) {
    return this.hospitalsService.create(dto);
  }

  @Get()
  findAll(@Query() query: QueryHospitalsDto) {
    return this.hospitalsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.hospitalsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateHospitalDto,
  ) {
    return this.hospitalsService.update(id, dto);
  }

  @Post(':id/resources')
  @HttpCode(HttpStatus.CREATED)
  createResource(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateHospitalResourceDto,
  ) {
    return this.hospitalsService.createResource(id, dto);
  }

  @Get(':id/resources')
  findResources(@Param('id', ParseUUIDPipe) id: string) {
    return this.hospitalsService.findResources(id);
  }

  @Patch(':id/resources/:resourceId')
  updateResource(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('resourceId', ParseUUIDPipe) resourceId: string,
    @Body() dto: UpdateHospitalResourceDto,
  ) {
    return this.hospitalsService.updateResource(id, resourceId, dto);
  }
}
