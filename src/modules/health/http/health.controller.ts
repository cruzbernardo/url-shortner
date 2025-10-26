import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { HealthService } from '../domain/health.service';
import { Public } from 'src/shared/validators/decorators';

@Controller('health')
@ApiTags('Health')
export class HealthController {
  constructor(private healthService: HealthService) {}

  @Get('')
  @Public()
  async check() {
    return this.healthService.getStatusApi();
  }
}
