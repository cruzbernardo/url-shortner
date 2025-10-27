import { ApiProperty } from '@nestjs/swagger';
import { Utils } from '../utils';

export class HttpExceptionModel {
  @ApiProperty()
  statusCode: number;
  @ApiProperty()
  message: string[];
  @ApiProperty()
  timestamp: string;
  @ApiProperty()
  path: string;
  @ApiProperty()
  detail?: any;
  constructor(status: number, error: any, path: string) {
    const response = error.getResponse();
    let msg;
    const detail = error.details || response.details;
    if (typeof response === 'object') {
      msg = response['message'] || error.message;
    } else {
      msg = error.message;
    }
    this.statusCode = status;
    this.message = typeof msg === 'string' ? [msg] : msg;
    this.detail = detail;
    this.timestamp = Utils.getNewDate().toISOString();
    this.path = path;
  }
}
