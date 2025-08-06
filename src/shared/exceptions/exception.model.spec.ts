import { ExceptionModel } from '.';
describe('exceptions', () => {
  describe('exceptions/exceptions.model', () => {
    it('should be return a correcty expections with error 422', () => {
      const exception = new ExceptionModel(
        422,
        { response: {} },
        '/api/default/buscar',
      );

      expect(exception).toMatchObject({
        statusCode: 422,
        message: ['Não foi possível processar sua requisição.'],
        path: '/api/default/buscar',
      });
    });

    it('should be return a correcty expections with error 500', () => {
      const exception = new ExceptionModel(500, null, '/api/default/buscar');

      expect(exception).toMatchObject({
        statusCode: 500,
        message: ['Erro Interno do servidor.'],
        path: '/api/default/buscar',
      });
    });
  });
});
