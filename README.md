## Installation

`yarn add firebase firesql`

or

`npm install firebase firesql`

## Usage

```ts
// If you want to query the collections at the root of the database
const firestoreSQL = new FirestoreSQL(firebase.firestore());

firestoreSQL.query('SELECT ...').then(documents => {
  documents.forEach(doc => {
    /* Do something with the document */
  });
});
```

or

```ts
// If you want to query the subcollections of a document
const docWithSubcollections = firebase.firestore().doc('someDoc');
const firestoreSQL = new FirestoreSQL(docWithSubcollections);

firestoreSQL.query('SELECT ...').then(result => {
  /* ... */
});
```

# Example

```ts
import { FirestoreSQL } from 'firesql';
import firebase from 'firebase/app';
import 'firebase/firestore';

firebase.initializeApp({ /* ... */ });

const firestoreSQL = new FirestoreSQL(firebase.firestore());

async function getData() {
  const someCities = await firestoreSQL.query(`
    SELECT name AS city, country, population AS people
    FROM cities
    WHERE country = 'USA' AND population > 700000
    ORDER BY country, population DESC
    LIMIT 10
  `);

  for (const city of someCities) {
    console.log(
      `${city.city} in ${city.country} has ${city.people} people`
    );
  }
}
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
