import { FireSQL } from '../../src/firesql';
import { initFirestore } from '../helpers/utils';

let fireSQL: FireSQL;

beforeAll(() => {
  initFirestore();
  fireSQL = new FireSQL();
});

// 'SELECT * FROM cities',
// "SELECT * FROM cities WHERE state = 'CA'",
// "SELECT * FROM cities WHERE country = 'USA' AND population > 700000",
// "SELECT * FROM cities WHERE country = 'USA' OR country = 'China'",
// "SELECT * FROM cities WHERE country = 'Japan' OR population < 1000000",
// "SELECT * FROM cities WHERE country = 'Japan' OR population > 1000000",
// "SELECT * FROM cities WHERE country = 'USA' AND capital",
// "SELECT * FROM cities WHERE country = 'USA' AND (capital OR population > 1000000)"
// "SELECT * FROM cities WHERE country IN ('USA', 'Japan')",
// "SELECT * FROM cities WHERE country IN ('USA', 'Japan') AND capital IS TRUE",
// "SELECT * FROM cities WHERE country != 'USA'",
// "SELECT * FROM cities WHERE name LIKE 'Sa%'",
// "SELECT * FROM cities WHERE state IS NULL",
// "SELECT * FROM cities WHERE population BETWEEN 700000 AND 2000000",
// "SELECT * FROM cities WHERE country = 'USA' UNION SELECT * FROM cities WHERE country = 'Japan'",

describe('WHERE', () => {
  it("throws when there's no conditions", async () => {
    expect.assertions(2);

    try {
      await fireSQL.query('SELECT * FROM shops WHERE');
    } catch (err) {
      expect(err).toBeInstanceOf(Error);
      expect(err).toHaveProperty('name', 'SyntaxError');
    }
  });

  it('from non-existant collection returns no documents', async () => {
    expect.assertions(2);

    const docs = await fireSQL.query('SELECT * FROM nonExistantCollection');

    expect(docs).toBeInstanceOf(Array);
    expect(docs).toHaveLength(0);
  });

  it('with "=" condition returns the correct documents', async () => {
    expect.assertions(3);

    const docs = await fireSQL.query(`
      SELECT category, name
      FROM shops
      WHERE category = 'Toys'
    `);

    expect(docs).toBeInstanceOf(Array);
    expect(docs).toHaveLength(3);
    expect(docs).toEqual([
      {
        category: 'Toys',
        name: 'Stiedemann, Keeling and Carter'
      },
      {
        category: 'Toys',
        name: 'Carroll Group'
      },
      {
        category: 'Toys',
        name: 'Leannon-Conroy'
      }
    ]);
  });
});
