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
} from '@nestjs/common';
import {
  CancelHandoverDto,
  CompleteHandoverDto,
  CreateHandoverDto,
  RejectHandoverDto,
  UpdateHandoverDto,
} from './dto/index.js';
import { HandoversService } from './handovers.service.js';

@Controller('handovers')
export class HandoversController {
  constructor(private readonly handoversService: HandoversService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateHandoverDto) {
    return this.handoversService.initiateHandover(dto);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.handoversService.findOne(id);
  }

  @Get('case/:caseId/active')
  findActiveByCaseId(@Param('caseId', ParseUUIDPipe) caseId: string) {
    return this.handoversService.findActiveByCaseId(caseId);
  }

  @Get('case/:caseId')
  findAllForCase(@Param('caseId', ParseUUIDPipe) caseId: string) {
    return this.handoversService.findAllForCase(caseId);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateHandoverDto,
  ) {
    return this.handoversService.updateHandover(id, dto);
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  complete(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CompleteHandoverDto,
  ) {
    return this.handoversService.completeHandover(id, dto);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectHandoverDto,
  ) {
    return this.handoversService.rejectHandover(id, dto);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelHandoverDto,
  ) {
    return this.handoversService.cancelHandover(id, dto);
  }
}
