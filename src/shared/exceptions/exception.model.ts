import { ApiProperty } from '@nestjs/swagger';
import { Utils } from '../utils';

export class ExceptionModel {
  @ApiProperty()
  statusCode: number;
  @ApiProperty()
  message: string[];
  @ApiProperty()
  timestamp: string;
  @ApiProperty()
  path: string;
  constructor(status: number, error: any, path: string) {
    this.statusCode = status;
    this.timestamp = Utils.getNewDate().toISOString();
    this.message = error?.response
      ? ['Não foi possível processar sua requisição.']
      : ['Erro Interno do servidor.'];
    this.path = path;
  }
}
