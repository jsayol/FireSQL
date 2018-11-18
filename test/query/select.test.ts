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
// "SELECT * FROM cities WHERE country = 'USA' OR country = 'Spain' ORDER BY population DESC, name",
// "SELECT * FROM cities WHERE population BETWEEN 700000 AND 2000000",
// "SELECT * FROM cities WHERE country = 'USA' UNION SELECT * FROM cities WHERE country = 'Japan'",
// "SELECT * FROM cities WHERE country = 'Japan' OR country = 'USA' LIMIT 3",
// "SELECT name AS city, population AS people FROM cities WHERE country = 'USA'"

describe('SELECT statement', () => {
  it('without conditions returns the correct documents', async () => {
    expect.assertions(4);

    const docs = await new FireSQL('shops/2DIHCbOMkKz0YcrKUsRf6kgF').query(
      'SELECT * FROM products'
    );

    expect(docs).toBeInstanceOf(Array);
    expect(docs).toHaveLength(4);

    // Should be doc 3UXchxNEyXZ0t1URO6DrIlFZ
    expect(docs[0]).toEqual({
      name: 'Juice - Lagoon Mango',
      price: 488.61,
      stock: 2
    });

    // Should be doc jpF9MHHfw8XyfZm2ukvfEXZK
    expect(docs[3]).toEqual({
      name: 'Graham Cracker Mix',
      price: 300.42,
      stock: 9
    });
  });
});
