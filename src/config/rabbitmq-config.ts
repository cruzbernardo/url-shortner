import { ConfigService } from '@nestjs/config';
import { RabbitMQConfig } from '@golevelup/nestjs-rabbitmq';

export const rabbitmqConfig = (
  configService: ConfigService,
): RabbitMQConfig => {
  const uri =
    configService.get<string>('RABBITMQ_URL') ||
    `amqp://${configService.get('RABBITMQ_USER')}:${configService.get('RABBITMQ_PASSWORD')}@rabbitmq:5672`;

  return {
    exchanges: [
      {
        name: configService.get<string>(
          'RABBITMQ_EXCHANGE_ANALYTICS',
          'analytics',
        ),
        type: 'topic',
      },
    ],
    uri,
    connectionInitOptions: { wait: false },
    enableControllerDiscovery: true,
  };
};
