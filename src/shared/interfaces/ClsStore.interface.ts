import { ClsStore } from 'nestjs-cls';

export interface ClsStoreInterface extends ClsStore {
  'x-trace-id': string;
  ip: string;
}
