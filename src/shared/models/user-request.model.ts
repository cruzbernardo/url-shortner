import { ApiProperty } from '@nestjs/swagger';
import { UserRequest } from '../interfaces';

export class UserRequestModel implements UserRequest {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  json(): UserRequest {
    return {
      id: this.id,
      email: this.email,
    };
  }
}
