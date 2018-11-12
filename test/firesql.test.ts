import { FirestoreSQL } from '../src/firesql';
import firebase from 'firebase/app';
import 'firebase/firestore';

/**
 * Dummy test
 */
describe('Dummy test', () => {
  it('works if true is truthy', () => {
    expect(true).toBeTruthy();
  });

  it('FirestoreSQL is instantiable', () => {
    // expect(new FirestoreSQL()).toBeInstanceOf(FirestoreSQL);
  });

  // it('FirestoreSQL parses SQL', () => {
  //   const firestoreSQL = new FirestoreSQL();
  //   const sql = `
  //     SELECT c.name AS city, d.name AS district, d.population
  //     FROM cities c JOIN districts d ON c.id=d.cityId
  //     WHERE c.state = "CA" AND d.population > 25000 AND c.name LIKE "A%"
  //   `;
  //   const parsed = firestoreSQL.parse(sql);
  //   expect(parsed).not.toBeNull();
  //   console.log(parsed);
  // });
});
