import { FireSQL } from '../../src/firesql';
import { initFirestore } from '../helpers/utils';

let fireSQL: FireSQL;

beforeAll(() => {
  initFirestore();
  fireSQL = new FireSQL();
});

// `
// SELECT city, category, AVG(price) AS avgPrice, SUM(price > 5)
// FROM restaurants
// WHERE category IN ("Mexican", "Indian", "Brunch")
// GROUP BY city, category
// `
// `
// SELECT SUM(price) AS sumPrice, AVG(price)
// FROM restaurants
// `

describe('SELECT', () => {
  it('from non-existant collection returns no documents', async () => {
    expect.assertions(2);

    const docs = await fireSQL.query('SELECT * FROM nonExistantCollection');

    expect(docs).toBeInstanceOf(Array);
    expect(docs).toHaveLength(0);
  });

  it("throws when there's no collection", async () => {
    expect.assertions(2);

    try {
      await fireSQL.query('SELECT * FROM');
    } catch (err) {
      expect(err).toBeInstanceOf(Error);
      expect(err).toHaveProperty('name', 'SyntaxError');
    }
  });

  it('without conditions returns the correct documents', async () => {
    expect.assertions(3);

    const docs = await new FireSQL('shops/2DIHCbOMkKz0YcrKUsRf6kgF').query(
      'SELECT * FROM products'
    );

    expect(docs).toBeInstanceOf(Array);
    expect(docs).toHaveLength(4);
    expect(docs).toEqual([
      {
        // doc 3UXchxNEyXZ0t1URO6DrIlFZ
        name: 'Juice - Lagoon Mango',
        price: 488.61,
        stock: 2
      },
      {
        // doc IO6DPA52DMRylKlOlUFkoWza
        name: 'Veal - Bones',
        price: 246.07,
        stock: 2
      },
      {
        // doc NNJ7ziylrHGcejJpY9p6drqM
        name: 'Juice - Apple, 500 Ml',
        price: 49.75,
        stock: 2
      },
      {
        // doc jpF9MHHfw8XyfZm2ukvfEXZK
        name: 'Graham Cracker Mix',
        price: 300.42,
        stock: 9
      },
    ]);
  });

  it('with "*" returns all fields', async () => {
    expect.assertions(2);

    const docs = await fireSQL.query(`
      SELECT *
      FROM shops
      WHERE name = 'Beer LLC'
    `);

    expect(docs).toHaveLength(1);

    // Should be doc 6yZrSjRzn8DzhjQ6MPv0HfTz
    expect(docs[0]).toEqual({
      name: 'Beer LLC',
      category: 'Baby',
      slogan: null,
      rating: 0.8,
      tags: [],
      manager: { name: 'Evanne Edelmann', phone: '814-869-1492' },
      contact: {
        address: '94839 Myrtle Park',
        city: 'Erie',
        postal: '16510',
        state: 'Pennsylvania'
      }
    });
  });

  it('with field list returns only those fields', async () => {
    expect.assertions(2);

    const docs = await fireSQL.query(`
      SELECT category, rating, \`manager.name\`
      FROM shops
      WHERE name = 'Beer LLC'
    `);

    expect(docs).toHaveLength(1);

    // Should be doc 6yZrSjRzn8DzhjQ6MPv0HfTz
    expect(docs[0]).toEqual({
      category: 'Baby',
      rating: 0.8,
      'manager.name': 'Evanne Edelmann'
    });
  });

  it('with field alias', async () => {
    expect.assertions(2);

    const docs = await fireSQL.query(`
      SELECT name AS aliasedName
      FROM shops
      WHERE name = 'Beer LLC'
    `);

    expect(docs).toHaveLength(1);

    // Should be doc 6yZrSjRzn8DzhjQ6MPv0HfTz
    expect(docs[0]).toEqual({
      aliasedName: 'Beer LLC'
    });
  });
});
