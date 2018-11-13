# Installation

Just add `firesql` and `firebase` to your project:

`yarn add firesql firebase`

or `npm install firesql firebase`

If you want to receive realtime updates when querying, then you will also need to install `rxjs` and `rxfire`:

`yarn add firesql firebase rxjs rxfire`

or `npm install firesql firebase rxjs rxfire`

# Usage

```ts
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

# Example

## One-time result (Promise)
```ts
import { FirestoreSQL } from 'firesql';
import firebase from 'firebase/app';
import 'firebase/firestore';

firebase.initializeApp({ /* ... */ });

const firestoreSQL = new FirestoreSQL(firebase.firestore());

async function getData() {
  const cities = await firestoreSQL.query(`
    SELECT name AS city, country, population AS people
    FROM cities
    WHERE country = 'USA' AND population > 700000
    ORDER BY country, population DESC
    LIMIT 10
  `);
  printCities(cities);
}

function printCities(cities) {
  for (const city of someCities) {
    console.log(
      `${city.city} in ${city.country} has ${city.people} people`
    );
  }
}
```

## Realtime updates (Observable)
```ts
import { FirestoreSQL } from 'firesql';
import 'firesql/rx'; // <-- Important! Don't forget
import firebase from 'firebase/app';
import 'firebase/firestore';

firebase.initializeApp({ /* ... */ });

const firestoreSQL = new FirestoreSQL(firebase.firestore());

const observable = firestoreSQL.rxQuery(`
  SELECT name AS city, country, population AS people
  FROM cities
  WHERE country = 'USA' AND population > 700000
  ORDER BY country, population DESC
  LIMIT 10
`);

observable.subscribe(cities => {
  console.log(`Got an update! There are ${cities.length} cities`);
  printCities(cities);
});
```

## Limitations

- Only `SELECT` for now. I might add `INSERT`, `UPDATE`, and `DELETE` in the future.
- No support for `JOIN`s yet.
- `LIMIT` doesn't accept an `OFFSET`, only a single number.
- No support for aggregate functions (`SUM`, `AVG`, `MIN`, `MAX`, etc.)

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
