import { FireSQL } from '../src/firesql';
import { initFirestore } from './helpers/utils';

let fireSQL: FireSQL;

beforeAll(() => {
  initFirestore();
  fireSQL = new FireSQL();
});

describe('Method query()', () => {
  it('returns a Promise', () => {
    const returnValue = fireSQL.query('SELECT * FROM nonExistantCollection');
    expect(returnValue).toBeInstanceOf(Promise);
  });

  it('expects one non-empty string argument', async () => {
    expect.assertions(3);

    try {
      await (fireSQL as any).query();
    } catch (err) {
      expect(err).not.toBeUndefined();
    }

    try {
      await (fireSQL as any).query('');
    } catch (err) {
      expect(err).not.toBeUndefined();
    }

    try {
      await (fireSQL as any).query(42);
    } catch (err) {
      expect(err).not.toBeUndefined();
    }
  });

  it('throws when SQL has syntax errors', async () => {
    expect.assertions(2);

    try {
      await fireSQL.query('not a valid query');
    } catch (err) {
      expect(err).toBeInstanceOf(Error);
      expect(err).toHaveProperty('name', 'SyntaxError');
    }
  });
});
