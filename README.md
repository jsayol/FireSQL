# FireSQL - Query Firestore using SQL syntax

## What is FireSQL?

FireSQL is a library built on top of the official Firebase SDK that allows you to query Cloud Firestore using SQL syntax. It's smart enough to issue the minimum amount of queries necessary to the Firestore servers in order to get the data that you request.

On top of that, it offers some of the handy utilities that you're used to when using SQL, so that it can provide a better querying experience beyond what's offered by the native querying methods.

**DISCLAIMER: This is a work in progress!** You're more than welcome to try it out and play with it, but please don't use it in production for now. Things might break :)

## Installation

Just add `firesql` and `firebase` to your project:

```sh
npm install firesql firebase
# or
yarn add firesql firebase
```

If you want to receive realtime updates when querying, then you will also need to install `rxjs` and `rxfire`:

```sh
npm install firesql firebase rxjs rxfire
# or
yarn add firesql firebase rxjs rxfire
```

## Usage

```js
// You can either query the collections at the root of the database...
const dbRef = firebase.firestore();

// ... or the subcollections of some document
const docRef = firebase.firestore().doc('someDoc');

// And then just pass that reference to FirestoreSQL
const firestoreSQL = new FirestoreSQL(dbRef);

// Use `.query()` to get a one-time result
firestoreSQL.query('SELECT ...').then(documents => {
  documents.forEach(doc => {
    /* Do something with the document */
  });
});

// Use `.rxQuery()` to get an observable for realtime results.
// Don't forget to import "firesql/rx" first (see example below).
firestoreSQL.rxQuery('SELECT ...').subscribe(documents => {
  /* Got an update with the documents! */
});

```

## Examples

### One-time result (Promise)

```js
import { FirestoreSQL } from 'firesql';
import firebase from 'firebase/app';
import 'firebase/firestore';

firebase.initializeApp({ /* ... */ });

const firestoreSQL = new FirestoreSQL(firebase.firestore());

const citiesPromise = firestoreSQL.query(`
  SELECT name AS city, country, population AS people
  FROM cities
  WHERE country = 'USA' AND population > 700000
  ORDER BY country, population DESC
  LIMIT 10
`);

citiesPromise.then(cities => {
  for (const city of cities) {
    console.log(
      `${city.city} in ${city.country} has ${city.people} people`
    );
  }
});
```

### Realtime updates (Observable)

```js
import { FirestoreSQL } from 'firesql';
import firebase from 'firebase/app';
import 'firesql/rx'; // <-- Important! Don't forget
import 'firebase/firestore';

firebase.initializeApp({ /* ... */ });

const firestoreSQL = new FirestoreSQL(firebase.firestore());

const cities$ = firestoreSQL.rxQuery(`
  SELECT name AS city, country, population AS people
  FROM cities
  WHERE country = 'USA' AND population > 700000
  ORDER BY country, population DESC
  LIMIT 10
`);

cities$.subscribe(cities => {
  console.log(`Got an update! There are ${cities.length} cities`);
  doSomething(cities);
});
```

## Limitations

- Only `SELECT` queries for now. Support for `INSERT`, `UPDATE`, and `DELETE` might come in the future.
- No support for `JOIN`s.
- `LIMIT` doesn't accept an `OFFSET`, only a single number.
- No support for aggregate functions (`SUM`, `AVG`, `MIN`, `MAX`, etc.)
- No support for negating conditions with `NOT`.
- Limited `LIKE`. Allows for searches in the form of `WHERE field LIKE 'value%'`, to look for fields that begin with the given value; and `WHERE field LIKE 'value'`, which is functionally equivalent to `WHERE field = 'value'`.

## Nested objects
You can access nested objects by using backticks around the field path. For example, if you have a collection "*products*" with documents like this:
```js
{
  productName: "Firebase Hot Sauce",
  details: {
    available: true,
    stock: 42
  }
}
```
You could do the following queries:
```sql
SELECT *
FROM products
WHERE `details.stock` > 10
```
```sql
SELECT productName, `details.stock` AS productStock
FROM products
WHERE `details.available` = true
```

## How does FireSQL work?

FireSQL transforms your SQL query into one or more queries to Firestore. Once all the necessary data has been retrieved, it does some internal processing in order to give you exactly what you asked for.

For example, take the following SQL:
```sql
SELECT *
FROM cities
WHERE country = 'USA' AND population > 50000
```
This would get transformed into this single Firestore query:
```js
db.collection('cities')
  .where('country', '==', 'USA')
  .where('population', '>', 50000);
```
That's pretty straightforward. But what about this one?
```sql
SELECT *
FROM cities
WHERE country = 'USA' OR population > 50000
```
There's no direct way to perform an `OR` query on Firestore so FireSQL splits that into 2 separate queries:
```js
db.collection('cities').where('country', '==', 'USA');
db.collection('cities').where('population', '>', 50000);
```
The results are then merged and any possible duplicates are eliminated.

The same principle applies to any other query. Some times your SQL will result in a single Firestore query and some other times it might result in several.

For example, take a seemingly simple SQL statement like the following:
```sql
SELECT *
FROM cities
WHERE country != 'Japan' AND region IN ('north', 'east', 'west') AND (capital = true OR population > 100000)
```
This will need to launch a total of 12 concurrent queries to Firestore!
```js
db.collection('cities').where('country', '<', 'Japan').where('region', '==', 'north').where('capital', '==', true);

db.collection('cities').where('country', '<', 'Japan').where('region', '==', 'east').where('capital', '==', true);

db.collection('cities').where('country', '<', 'Japan').where('region', '==', 'west').where('capital', '==', true);

db.collection('cities').where('country', '>', 'Japan').where('region', '==', 'north').where('capital', '==', true);

db.collection('cities').where('country', '>', 'Japan').where('region', '==', 'east').where('capital', '==', true);

db.collection('cities').where('country', '>', 'Japan').where('region', '==', 'west').where('capital', '==', true);

db.collection('cities').where('country', '<', 'Japan').where('region', '==', 'north').where('population', '>', 100000);

db.collection('cities').where('country', '<', 'Japan').where('region', '==', 'east').where('population', '>', 100000);

db.collection('cities').where('country', '<', 'Japan').where('region', '==', 'west').where('population', '>', 100000);

db.collection('cities').where('country', '>', 'Japan').where('region', '==', 'north').where('population', '>', 100000);

db.collection('cities').where('country', '>', 'Japan').where('region', '==', 'east').where('population', '>', 100000);

db.collection('cities').where('country', '>', 'Japan').where('region', '==', 'west').where('population', '>', 100000);

```
As you can see, SQL offers a very concise and powerful way to express your query. But as they say, ***with a lot of power comes a lot of responsibility***. Always be mindful of the underlying data model when using FireSQL.

## Examples of supported queries:

```sql
SELECT *
FROM restaurants
```

```sql
SELECT name, price
FROM restaurants
WHERE city = 'Chicago'
```

```sql
SELECT *
FROM restaurants
WHERE category = 'Indian' AND price < 50
```

```sql
SELECT *
FROM restaurants
WHERE name LIKE 'Best%'
```

```sql
SELECT *
FROM restaurants
WHERE name LIKE 'Best%' OR city = 'Los Angeles'
```

```sql
SELECT *
FROM restaurants
WHERE city IN ( 'Raleigh', 'Nashvile', 'Denver' )
```

```sql
SELECT *
FROM restaurants
WHERE city != 'Oklahoma'
```

```sql
SELECT *
FROM restaurants
WHERE favorite = true
```

```sql
SELECT *
FROM restaurants
WHERE favorite -- Equivalent to the previous one
```

```sql
SELECT *
FROM restaurants
WHERE favorite IS NULL
```

```sql
SELECT *
FROM restaurants
WHERE city = 'Memphis' AND ( price < 40 OR avgRating > 8 )
ORDER BY price DESC, avgRating
```

```sql
SELECT *
FROM restaurants
WHERE price BETWEEN 25 AND 150
ORDER BY city, price
LIMIT 10
```

```sql
SELECT *
FROM restaurants
WHERE city = 'Chicago'
UNION
SELECT *
FROM restaurants
WHERE price > 200
```
