import {
  HttpException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { HttpExceptionModel } from '.';
describe('exceptions', () => {
  describe('exceptions/http-exceptions.model', () => {
    it('should be return a correcty expections with error 422', () => {
      const error = new UnprocessableEntityException('erro não definido');
      const exception = new HttpExceptionModel(
        error.getStatus(),
        error,
        '/api/default/buscar',
      );

      expect(exception).toMatchObject({
        statusCode: 422,
        message: ['erro não definido'],
        path: '/api/default/buscar',
      });
    });

    it('should be return a correcty expections with error 422 and array msg', () => {
      const error = new UnprocessableEntityException([
        'erro não definido',
        'nome é obrigatorio',
      ]);
      const exception = new HttpExceptionModel(
        error.getStatus(),
        error,
        '/api/default/buscar',
      );

      expect(exception).toMatchObject({
        statusCode: 422,
        message: ['erro não definido', 'nome é obrigatorio'],
        path: '/api/default/buscar',
      });
    });

    it('should be return a correcty expections with error 422 without response', () => {
      const exception = new HttpExceptionModel(
        422,
        new HttpException('erro não definido', 422),
        '/api/default/buscar',
      );

      expect(exception).toMatchObject({
        statusCode: 422,
        message: ['erro não definido'],
        path: '/api/default/buscar',
      });
    });

    it('should be return a correcty expections with error 401', () => {
      const error = new UnauthorizedException('Token is required');
      const exception = new HttpExceptionModel(
        error.getStatus(),
        error,
        '/api/default/buscar',
      );

      expect(exception).toMatchObject({
        statusCode: 401,
        message: ['Token is required'],
        path: '/api/default/buscar',
      });
    });

    it('should be return a correcty expections with error unknow', () => {
      const error = new HttpException({ reason: 'Erro Unknow' }, 400);
      const exception = new HttpExceptionModel(
        error.getStatus(),
        error,
        '/api/default/buscar',
      );

      expect(exception).toMatchObject({
        statusCode: 400,
        message: ['Http Exception'],
        path: '/api/default/buscar',
      });
    });
  });
});
