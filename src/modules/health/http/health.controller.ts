import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { HealthService } from '../domain/health.service';
import { Public } from 'src/shared/validators/decorators';
import { SkipThrottle } from '@nestjs/throttler';

@Controller('health')
@ApiTags('Health')
export class HealthController {
  constructor(private healthService: HealthService) {}

  @Get('')
  @Public()
  @SkipThrottle({ short: true, medium: true, long: true })
  async check() {
    return this.healthService.getStatusApi();
  }
}
