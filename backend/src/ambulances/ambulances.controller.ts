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
import { AmbulancesService } from './ambulances.service.js';
import {
  CreateAmbulanceDto,
  QueryAmbulancesDto,
  UpdateAmbulanceStatusDto,
} from './dto/index.js';

@Controller('ambulances')
export class AmbulancesController {
  constructor(private readonly ambulancesService: AmbulancesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateAmbulanceDto) {
    return this.ambulancesService.create(dto);
  }

  @Get()
  findAll(@Query() query: QueryAmbulancesDto) {
    return this.ambulancesService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.ambulancesService.findOne(id);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAmbulanceStatusDto,
  ) {
    return this.ambulancesService.updateStatus(id, dto);
  }
}
