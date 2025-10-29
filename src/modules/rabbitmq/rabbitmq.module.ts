import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { rabbitmqConfig } from 'src/config/rabbitmq-config';

@Module({
  imports: [
    RabbitMQModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) =>
        rabbitmqConfig(configService),
    }),
  ],
  exports: [RabbitMQModule],
})
export class RabbitMQWrapperModule {}
