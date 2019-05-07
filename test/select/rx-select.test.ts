// import admin from 'firebase-admin';
import { FireSQL } from '../../src/firesql';
import { initFirestore, /*, initAdminFirestore*/ } from '../helpers/utils';
import { first } from 'rxjs/operators';
import '../../src/rx';

// let adminFirestore: admin.firestore.Firestore;
let firestore: firebase.firestore.Firestore;
let fireSQL: FireSQL;

beforeAll(() => {
  // adminFirestore = initAdminFirestore();
  firestore = initFirestore();
  fireSQL = new FireSQL();
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

  // it('returns the correct documents using firebase-admin', done => {
  //   expect.assertions(3);

  //   const docs$ = new FireSQL(
  //     adminFirestore.doc('shops/2DIHCbOMkKz0YcrKUsRf6kgF')
  //   ).rxQuery('SELECT * FROM products');

  //   docs$.pipe(first()).subscribe(docs => {
  //     expect(docs).toBeInstanceOf(Array);
  //     expect(docs).toHaveLength(4);
  //     expect(docs).toEqual([
  //       {
  //         // doc 3UXchxNEyXZ0t1URO6DrIlFZ
  //         name: 'Juice - Lagoon Mango',
  //         price: 488.61,
  //         stock: 2
  //       },
  //       {
  //         // doc IO6DPA52DMRylKlOlUFkoWza
  //         name: 'Veal - Bones',
  //         price: 246.07,
  //         stock: 2
  //       },
  //       {
  //         // doc NNJ7ziylrHGcejJpY9p6drqM
  //         name: 'Juice - Apple, 500 Ml',
  //         price: 49.75,
  //         stock: 2
  //       },
  //       {
  //         // doc jpF9MHHfw8XyfZm2ukvfEXZK
  //         name: 'Graham Cracker Mix',
  //         price: 300.42,
  //         stock: 9
  //       }
  //     ]);

  //     done();
  //   });
  // });
});
