import { Module } from '@nestjs/common';
import { HealthService } from './domain/health.service';
import { HealthController } from './http/health.controller';
import { TerminusModule } from '@nestjs/terminus';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [TerminusModule, ConfigModule, HttpModule],
  providers: [HealthService],
  controllers: [HealthController],
})
export class HealthModule {}
