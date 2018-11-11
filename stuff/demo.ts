import firebase from 'firebase/app';
import 'firebase/firestore';

class SQLFirestore {
  constructor(fs: firebase.firestore.Firestore) {
      // nothing
  }
  query(sql: string): any[] {
    return [];
  }
}




firebase.initializeApp({/* ... */});

const sqlFirestore = new SQLFirestore(firebase.firestore());

async function getData() {
  const someCities = await sqlFirestore.query(`
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
