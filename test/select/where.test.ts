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

  test('non-existant collection returns no documents', async () => {
    expect.assertions(2);

    const docs = await fireSQL.query('SELECT * FROM nonExistantCollection');

    expect(docs).toBeInstanceOf(Array);
    expect(docs).toHaveLength(0);
  });

  test('"=" condition', async () => {
    expect.assertions(1);

    const docs = await fireSQL.query(`
      SELECT category, name
      FROM shops
      WHERE category = 'Toys'
    `);

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

  test('"<" condition', async () => {
    expect.assertions(1);

    const docs = await fireSQL.query(`
      SELECT category, name
      FROM shops
      WHERE rating < 0.3
    `);

    expect(docs).toEqual([
      {
        category: 'Toys',
        name: 'Carroll Group'
      }
    ]);
  });

  test('">" condition', async () => {
    expect.assertions(1);

    const docs = await fireSQL.query(`
      SELECT category, name
      FROM shops
      WHERE rating > 4.8
    `);

    expect(docs).toEqual([
      {
        category: 'Automotive',
        name: 'Grady, Kirlin and Welch'
      }
    ]);
  });

  test('"<=" condition', async () => {
    expect.assertions(1);

    const docs = await fireSQL.query(`
      SELECT category, name
      FROM shops
      WHERE rating <= 0.4
    `);

    expect(docs).toEqual([
      {
        category: 'Toys',
        name: 'Carroll Group'
      },
      {
        category: 'Movies',
        name: 'Stark-Keebler'
      },
      {
        category: 'Home',
        name: 'Nikolaus-Borer'
      },
      {
        category: 'Games',
        name: 'Frami, Reynolds and Fay'
      }
    ]);
  });

  test('">=" condition', async () => {
    expect.assertions(1);

    const docs = await fireSQL.query(`
      SELECT category, name
      FROM shops
      WHERE rating >= 4.8
    `);

    expect(docs).toEqual([
      {
        category: 'Home',
        name: 'Grant, Wisoky and Baumbach'
      },
      {
        category: 'Beauty',
        name: 'Torp Inc'
      },
      {
        category: 'Automotive',
        name: 'Grady, Kirlin and Welch'
      }
    ]);
  });

  test('"!=" condition', async () => {
    expect.assertions(1);

    const docs = await new FireSQL('/shops/mEjD3yDXz2Her0OtIGGMeZGx').query(`
      SELECT *
      FROM products
      WHERE stock != 9
    `);

    expect(docs).toEqual([
      {
        name: 'Pepper - Chilli Seeds Mild',
        price: 290.4,
        stock: 6
      },
      {
        name: 'Cake - French Pear Tart',
        price: 298.31,
        stock: 10
      }
    ]);
  });

  test('"IN" condition', async () => {
    expect.assertions(1);

    const docs = await fireSQL.query(`
      SELECT \`contact.postal\`, \`contact.state\`, name
      FROM shops
      WHERE \`contact.postal\` IN ('32204', '95813')
    `);

    expect(docs).toEqual([
      {
        'contact.postal': '32204',
        'contact.state': 'Florida',
        name: 'Cummings Inc'
      },
      {
        'contact.postal': '95813',
        'contact.state': 'California',
        name: 'Leannon-Conroy'
      }
    ]);
  });

  test('"BETWEEN" condition', async () => {
    expect.assertions(1);

    const docs = await fireSQL.query(`
      SELECT name, rating
      FROM shops
      WHERE rating BETWEEN 3.1 AND 3.3
    `);

    expect(docs).toEqual([
      {
        name: 'Cummings Inc',
        rating: 3.1
      },
      {
        name: 'Lehner-Bartell',
        rating: 3.2
      },
      {
        name: 'Oberbrunner, Runte and Rippin',
        rating: 3.3
      },
      {
        name: 'Aufderhar, Lindgren and Okuneva',
        rating: 3.3
      }
    ]);
  });

  test('"LIKE \'value%\'" condition (begins with)', async () => {
    expect.assertions(1);

    const docs = await fireSQL.query(`
      SELECT name, category
      FROM shops
      WHERE name LIKE 'Wa%'
    `);

    expect(docs).toEqual([
      {
        name: 'Waelchi, Schultz and Skiles',
        category: 'Jewelery'
      },
      {
        name: 'Waelchi-Koss',
        category: 'Industrial'
      },
      {
        name: 'Walker-Keeling',
        category: 'Outdoors'
      }
    ]);
  });

  test('"LIKE \'value\'" condition behaves like "="', async () => {
    expect.assertions(1);

    const docs1 = await fireSQL.query(`
      SELECT category, name
      FROM shops
      WHERE category = 'Toys'
    `);

    const docs2 = await fireSQL.query(`
      SELECT category, name
      FROM shops
      WHERE category LIKE 'Toys'
    `);

    expect(docs1).toEqual(docs2);
  });

  test('"IS" condition behaves like "="', async () => {
    expect.assertions(1);

    const docs1 = await fireSQL.query(`
      SELECT category, name
      FROM shops
      WHERE category = 'Toys'
    `);

    const docs2 = await fireSQL.query(`
      SELECT category, name
      FROM shops
      WHERE category IS 'Toys'
    `);

    expect(docs1).toEqual(docs2);
  });

  test('"AND" operator', async () => {
    expect.assertions(1);

    const docs = await fireSQL.query(`
      SELECT name, slogan
      FROM shops
      WHERE rating = 4 AND category = 'Toys'
    `);

    expect(docs).toEqual([
      {
        name: 'Stiedemann, Keeling and Carter',
        slogan: 'incubate B2C ROI'
      }
    ]);
  });

  test('"OR" operator', async () => {
    expect.assertions(1);

    const docs = await fireSQL.query(`
      SELECT name, slogan
      FROM shops
      WHERE rating = 4 OR category = 'Toys'
    `);

    expect(docs).toEqual([
      {
        name: 'Stiedemann, Keeling and Carter',
        slogan: 'incubate B2C ROI'
      },
      {
        name: 'Adams-Nikolaus',
        slogan: null
      },
      {
        name: 'Lesch-Windler',
        slogan: null
      },
      {
        name: 'Carroll Group',
        slogan: null
      },
      {
        name: 'Leannon-Conroy',
        slogan: 'integrate magnetic interfaces'
      }
    ]);
  });

  test('multiple nested operators', async () => {
    expect.assertions(1);

    const docs = await fireSQL.query(`
      SELECT name, rating, category, \`contact.state\`
      FROM shops
      WHERE rating < 2
        AND (
          \`contact.state\` = 'California'
          OR
          category IN ('Computers', 'Automotive')
        )
    `);

    expect(docs).toEqual([
      {
        name: 'Orn-Auer',
        rating: 0.6,
        category: 'Outdoors',
        'contact.state': 'California'
      },
      {
        name: 'Trantow, Deckow and Oberbrunner',
        rating: 1.5,
        category: 'Shoes',
        'contact.state': 'California'
      },
      {
        name: 'Schumm-Zieme',
        rating: 0.9,
        category: 'Computers',
        'contact.state': 'Ohio'
      }
    ]);
  });

  test('using "__name__" filters by document key', async () => {
    expect.assertions(1);

    const docs = await fireSQL.query(`
      SELECT name
      FROM shops
      WHERE __name__ = 'A2AwXRvhW3HmEivfS5LPH3s8'
    `);

    expect(docs).toEqual([
      {
        name: 'Price, Monahan and Bogisich'
      }
    ]);
  });

  // TODO: Can't combine "LIKE 'value%'" with inequality filters (>, <=, ...)
  /*
      SELECT *
      FROM shops
      WHERE rating > 2 AND name LIKE 'T%'
  */
});
