import { Controller, Get } from '@nestjs/common';
import { Public } from './auth/index.js';

@Controller('health')
export class AppController {
  @Public()
  @Get()
  getHealth() {
    return {
      status: 'ok',
      service: 'raah-care-backend',
    };
  }
}