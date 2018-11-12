import firebase from 'firebase/app';
import 'firebase/firestore';
import { FirestoreSQL } from '../src/firesql';

firebase.initializeApp({
  /* ... */
});

const firestoreSQL = new FirestoreSQL(firebase.firestore());

async function getData() {
  const someCities = await firestoreSQL.query(`
    SELECT name, country, population
    FROM cities
    WHERE country = 'USA' AND population > 700000
  `);

  for (const city of someCities) {
    console.log(
      `${city.name} in ${city.country} has ${city.population} people`
    );
  }
}

getData();
