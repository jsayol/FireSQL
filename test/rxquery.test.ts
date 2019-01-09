import { FireSQL } from '../src/firesql';
import { initFirestore } from './helpers/utils';
import { Observable } from 'rxjs';
import '../src/rx';

let firestore: firebase.firestore.Firestore;
let fireSQL: FireSQL;

beforeAll(() => {
  firestore = initFirestore();
  fireSQL = new FireSQL();
});

afterAll(async () => {
  // Cleanup
  await fireSQL.ref
    .collection('shops/p0H5osOFWCPlT1QthpXUnnzI/products')
    .doc('rxQueryTest')
    .delete()
    .catch(() => void 0); // We don't want any failure here to affect the tests
  firestore.app.delete();
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
      (fireSQL as any).rxQuery();
    } catch (err) {
      expect(err).toBeDefined();
    }

    try {
      (fireSQL as any).rxQuery('');
    } catch (err) {
      expect(err).toBeDefined();
    }

    try {
      (fireSQL as any).rxQuery(42);
    } catch (err) {
      expect(err).toBeDefined();
    }
  });

  it('accepts options as second argument', async () => {
    expect.assertions(1);

    try {
      const returnValue = fireSQL.rxQuery(
        'SELECT * FROM nonExistantCollection',
        {
          includeId: true
        }
      );
      expect(returnValue).toBeInstanceOf(Observable);
    } catch (err) {
      // We're testing that query() doesn't throw, so
      // this assertion shouldn't be reached.
      expect(true).toBe(false);
    }
  });

  it('throws when SQL has syntax errors', async () => {
    expect.assertions(2);

    try {
      fireSQL.rxQuery('not a valid query');
    } catch (err) {
      expect(err).toBeInstanceOf(Error);
      expect(err).toHaveProperty('name', 'SyntaxError');
    }
  });

  test('Observable emits when data changes', done => {
    expect.assertions(2);

    const docRef = fireSQL.ref
      .collection('shops/p0H5osOFWCPlT1QthpXUnnzI/products')
      .doc('rxQueryTest');
    const initialData = {
      test: 'Testing rxQuery()',
      value: 42
    };
    docRef.set(initialData);

    let emits = 0;

    const query$ = new FireSQL('shops/p0H5osOFWCPlT1QthpXUnnzI').rxQuery(`
      SELECT *
      FROM products
      WHERE __name__ = "rxQueryTest"
    `);

    const subsctiprion = query$.subscribe(docs => {
      if (emits++ === 0) {
        expect(docs).toEqual([initialData]);
        docRef.update({ rating: 123 });
      } else {
        expect(docs).toEqual([{ ...initialData, rating: 123 }]);
        subsctiprion.unsubscribe();
        done();
      }
    });
  });
});
