import { Module, Global } from '@nestjs/common';
import { instance } from 'src/config/winston-logger';

@Global()
@Module({
  providers: [
    {
      provide: 'winston',
      useValue: instance,
    },
  ],
  exports: ['winston'],
})
export class LoggingModule {}
