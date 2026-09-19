import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service';
import { Public } from '@shared/tenant-context';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get welcome message' })
  @ApiResponse({ status: 200, description: 'Returns welcome message.' })
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  @Public()
  check() {
    return { status: 'ok' };
  }
}
