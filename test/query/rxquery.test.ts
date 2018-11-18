import { FireSQL } from '../../src/firesql';
import { initFirestore } from '../helpers/utils';
import { Observable } from 'rxjs';
import '../../src/rx';

let fireSQL: FireSQL;

beforeAll(() => {
  initFirestore();
  fireSQL = new FireSQL();
});

describe('Method rxQuery()', () => {
  it('FireSQL has rxQuery() method', () => {
    expect(typeof fireSQL.rxQuery).toBe('function');
  });

  it('returns an Observable', () => {
    const returnValue = fireSQL.rxQuery('SELECT * FROM nonExistantCollection');
    expect(returnValue).toBeInstanceOf(Observable);
  });

  it('expects one non-empty string argument', async () => {
    expect.assertions(3);

    try {
      await (fireSQL as any).rxQuery();
    } catch (err) {
      expect(err).not.toBeUndefined();
    }

    try {
      await (fireSQL as any).rxQuery('');
    } catch (err) {
      expect(err).not.toBeUndefined();
    }

    try {
      await (fireSQL as any).rxQuery(42);
    } catch (err) {
      expect(err).not.toBeUndefined();
    }
  });

  it('throws when SQL has syntax errors', async () => {
    expect.assertions(2);

    try {
      await fireSQL.rxQuery('not a valid query');
    } catch (err) {
      expect(err).toBeInstanceOf(Error);
      expect(err).toHaveProperty('name', 'SyntaxError');
    }
  });
});
