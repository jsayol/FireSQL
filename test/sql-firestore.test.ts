import SQLFirestore from '../src/sql-firestore';
import firebase from 'firebase/app';
import 'firebase/firestore';

/**
 * Dummy test
 */
describe('Dummy test', () => {
  it('works if true is truthy', () => {
    expect(true).toBeTruthy();
  });

  it('SQLFirestore is instantiable', () => {
    expect(new SQLFirestore()).toBeInstanceOf(SQLFirestore);
  });

  it('SQLFirestore parses SQL', () => {
    const sqlFirestore = new SQLFirestore();
    const sql = `
      SELECT c.name AS city, d.name AS district, d.population
      FROM cities c JOIN districts d ON c.id=d.cityId
      WHERE c.state = "CA" AND d.population > 25000 AND c.name LIKE "A%"
    `;
    const parsed = sqlFirestore.parse(sql);
    expect(parsed).not.toBeNull();
    console.log(parsed);
  });
});
