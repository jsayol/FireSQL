// import admin from 'firebase-admin';
import { FireSQL } from '../../src/firesql';
import { initFirestore /*, initAdminFirestore*/ } from '../helpers/utils';
import { DOCUMENT_KEY_NAME } from '../../src/utils';

// let adminFirestore: admin.firestore.Firestore;
let firestore: firebase.firestore.Firestore;
let fireSQL: FireSQL;

beforeAll(() => {
  // adminFirestore = initAdminFirestore();
  firestore = initFirestore();
  fireSQL = new FireSQL(firestore);
});

describe('SELECT', () => {
  it('returns no documents from non-existant collection', async () => {
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

  test('without conditions returns the correct documents', async () => {
    expect.assertions(3);

    const docs = await new FireSQL(
      firestore.doc('shops/2DIHCbOMkKz0YcrKUsRf6kgF')
    ).query('SELECT * FROM products');

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
      }
    ]);
  });

  // it('returns the correct documents using firebase-admin', async () => {
  //   expect.assertions(3);

  //   const docs = await new FireSQL(
  //     adminFirestore.doc('shops/2DIHCbOMkKz0YcrKUsRf6kgF')
  //   ).query('SELECT * FROM products');

  //   expect(docs).toBeInstanceOf(Array);
  //   expect(docs).toHaveLength(4);
  //   expect(docs).toEqual([
  //     {
  //       // doc 3UXchxNEyXZ0t1URO6DrIlFZ
  //       name: 'Juice - Lagoon Mango',
  //       price: 488.61,
  //       stock: 2
  //     },
  //     {
  //       // doc IO6DPA52DMRylKlOlUFkoWza
  //       name: 'Veal - Bones',
  //       price: 246.07,
  //       stock: 2
  //     },
  //     {
  //       // doc NNJ7ziylrHGcejJpY9p6drqM
  //       name: 'Juice - Apple, 500 Ml',
  //       price: 49.75,
  //       stock: 2
  //     },
  //     {
  //       // doc jpF9MHHfw8XyfZm2ukvfEXZK
  //       name: 'Graham Cracker Mix',
  //       price: 300.42,
  //       stock: 9
  //     }
  //   ]);
  // });

  test('with "*" returns all fields', async () => {
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

  test('with field list returns only those fields', async () => {
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

  test('with field alias', async () => {
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

  it('returns document id with global includeId=true option', async () => {
    expect.assertions(2);

    const docs = await new FireSQL(fireSQL.ref, { includeId: true }).query(`
      SELECT *
      FROM shops
      WHERE name = 'Beer LLC'
    `);

    expect(docs).toHaveLength(1);
    expect(docs[0]).toHaveProperty(
      DOCUMENT_KEY_NAME,
      '6yZrSjRzn8DzhjQ6MPv0HfTz'
    );
  });

  it('returns document id with query includeId=true option', async () => {
    expect.assertions(2);

    const docs = await fireSQL.query(
      `
      SELECT *
      FROM shops
      WHERE name = 'Beer LLC'
      `,
      { includeId: true }
    );

    expect(docs).toHaveLength(1);
    expect(docs[0]).toHaveProperty(
      DOCUMENT_KEY_NAME,
      '6yZrSjRzn8DzhjQ6MPv0HfTz'
    );
  });

  it("doesn't return document id with query includeId=false and global includeId=true", async () => {
    expect.assertions(2);

    const docs = await new FireSQL(fireSQL.ref, { includeId: true }).query(
      `
      SELECT *
      FROM shops
      WHERE name = 'Beer LLC'
      `,
      { includeId: false }
    );

    expect(docs).toHaveLength(1);
    expect(docs[0]).not.toHaveProperty(DOCUMENT_KEY_NAME);
  });

  it('returns document id with global includeId="alias" option', async () => {
    expect.assertions(3);

    const docs = await new FireSQL(fireSQL.ref, { includeId: 'docIdAlias' })
      .query(`
      SELECT *
      FROM shops
      WHERE name = 'Beer LLC'
    `);

    expect(docs).toHaveLength(1);
    expect(docs[0]).not.toHaveProperty(DOCUMENT_KEY_NAME);
    expect(docs[0]).toHaveProperty('docIdAlias', '6yZrSjRzn8DzhjQ6MPv0HfTz');
  });

  it('returns document id with query includeId="alias" option', async () => {
    expect.assertions(3);

    const docs = await fireSQL.query(
      `
      SELECT *
      FROM shops
      WHERE name = 'Beer LLC'
      `,
      { includeId: 'docIdAlias' }
    );

    expect(docs).toHaveLength(1);
    expect(docs[0]).not.toHaveProperty(DOCUMENT_KEY_NAME);
    expect(docs[0]).toHaveProperty('docIdAlias', '6yZrSjRzn8DzhjQ6MPv0HfTz');
  });

  it('returns document id with includeId=true even if not in SELECTed fields', async () => {
    expect.assertions(2);

    const docs = await fireSQL.query(
      `
      SELECT rating
      FROM shops
      WHERE name = 'Beer LLC'
      `,
      { includeId: true }
    );

    expect(docs).toHaveLength(1);
    expect(docs[0]).toHaveProperty(
      DOCUMENT_KEY_NAME,
      '6yZrSjRzn8DzhjQ6MPv0HfTz'
    );
  });

  test('"__name__" returns the document key', async () => {
    expect.assertions(2);

    const docs = await fireSQL.query(`
      SELECT ${DOCUMENT_KEY_NAME}
      FROM shops
      WHERE name = 'Simonis, Howe and Kovacek'
    `);

    expect(docs).toHaveLength(1);
    expect(docs[0]).toHaveProperty(
      DOCUMENT_KEY_NAME,
      'AbvczIyCuxEof6TpfOSwdsGO'
    );
  });

  test('"__name__" can be aliased', async () => {
    expect.assertions(3);

    const docs = await fireSQL.query(`
      SELECT ${DOCUMENT_KEY_NAME} AS docIdAlias
      FROM shops
      WHERE name = 'Simonis, Howe and Kovacek'
    `);

    expect(docs).toHaveLength(1);
    expect(docs[0]).not.toHaveProperty(DOCUMENT_KEY_NAME);
    expect(docs[0]).toHaveProperty('docIdAlias', 'AbvczIyCuxEof6TpfOSwdsGO');
  });

  it('filters duplicate documents from combined queries', async () => {
    expect.assertions(3);

    const docs1 = await fireSQL.query(`
        SELECT *
        FROM shops
        WHERE category = 'Toys'
    `);
    expect(docs1).toHaveLength(3);

    const docs2 = await fireSQL.query(`
        SELECT *
        FROM shops
        WHERE rating > 3
    `);
    expect(docs2).toHaveLength(20);

    const docs3 = await fireSQL.query(`
        SELECT *
        FROM shops
        WHERE category = 'Toys' OR rating > 3
    `);
    expect(docs3).toHaveLength(21); // rather than 23 (3 + 20)
  });

  test('collection group query returns the correct documents', async () => {
    expect.assertions(3);

    const docs = await fireSQL.query(`
      SELECT *
      FROM GROUP products
      WHERE price < 10
    `);

    expect(docs).toBeInstanceOf(Array);
    expect(docs).toHaveLength(3);
    expect(docs).toEqual([
      {
        name: 'Juice - Grape, White',
        price: 5.72,
        stock: 7
      },
      {
        name: 'Wine - Baron De Rothschild',
        price: 5.86,
        stock: 4
      },
      {
        name: 'Tart Shells - Barquettes, Savory',
        price: 8.63,
        stock: 4
      }
    ]);
  });

  // TODO:
  // `
  // SELECT city, category, AVG(price) AS avgPrice, SUM(price > 5)
  // FROM restaurants
  // WHERE category IN ("Mexican", "Indian", "Brunch")
  // GROUP BY city, category
  // `

  // TODO:
  // `
  // SELECT SUM(price) AS sumPrice, AVG(price)
  // FROM restaurants
  // `
});
