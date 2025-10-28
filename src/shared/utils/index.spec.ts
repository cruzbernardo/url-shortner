import { Utils } from '.';

describe('Utils', () => {
  describe('getNewDate', () => {
    it('shoud be return a valid Date when a called unless parameter', () => {
      const date = Utils.getNewDate();
      expect(date).toBeInstanceOf(Date);
    });

    it('should be return a valid Date when a called with paramenter', () => {
      const inputDate = '2023-06-01T03:00:00.000Z';
      const expectedDate = new Date(inputDate);

      const date = Utils.getNewDate(inputDate);
      expect(date).toBeInstanceOf(Date);
      expect(date).toEqual(expectedDate);
    });
  });
});
