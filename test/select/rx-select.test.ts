import { FireSQL } from '../../src/firesql';
import { initFirestore } from '../helpers/utils';
import { first } from 'rxjs/operators';
import '../../src/rx';

let firestore: firebase.firestore.Firestore;
let fireSQL: FireSQL;

beforeAll(() => {
  firestore = initFirestore();
  fireSQL = new FireSQL();
});

afterAll(() => {
  firestore.app.delete();
});

describe('rxQuery() SELECT', () => {
  it('filters duplicate documents from combined queries', done => {
    expect.assertions(3);

    let doneSteps = 0;
    const checkDone = () => {
      if (++doneSteps === 3) {
        done();
      }
    };

    const query1$ = fireSQL.rxQuery(`
        SELECT *
        FROM shops
        WHERE category = 'Toys'
    `);

    query1$.pipe(first()).subscribe(docs => {
      expect(docs).toHaveLength(3);
      checkDone();
    });

    const query2$ = fireSQL.rxQuery(`
        SELECT *
        FROM shops
        WHERE rating > 3
    `);

    query2$.pipe(first()).subscribe(docs => {
      expect(docs).toHaveLength(20);
      checkDone();
    });

    const query3$ = fireSQL.rxQuery(`
        SELECT *
        FROM shops
        WHERE category = 'Toys' OR rating > 3
    `);

    query3$.pipe(first()).subscribe(docs => {
      expect(docs).toHaveLength(21); // rather than 23 (3 + 20)
      checkDone();
    });
  });
});
