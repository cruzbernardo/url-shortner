import { Request } from 'express';

export interface PartialUser {
  id: string;
  name: string;
}

export interface UserRequestWithData extends Request {
  user: PartialUser;
}
