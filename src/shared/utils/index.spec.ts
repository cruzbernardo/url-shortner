
import { Utils } from '.';

describe('Utils', () => {
  describe('getNewDate', () => {
    it('shoud be return a valid Date when a called unless parameter', () => {
      const date = Utils.getNewDate();
      expect(date).toBeInstanceOf(Date);
    });

    it('should be return a valid Date when a called with paramenter', () => {
      const mock = new Date(2023, 5, 1, 0, 0, 0, 0);

      const date = Utils.getNewDate('2023-06-01T03:00:00.000Z');
      expect(date).toBeInstanceOf(Date);
      expect(date).toEqual(mock);
    });
  });
});
