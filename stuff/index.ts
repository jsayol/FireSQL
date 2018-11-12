import FirestoreSQL from '../src/firestore-sql';
import firebase from 'firebase/app';
import 'firebase/firestore';

firebase.initializeApp({
  apiKey: 'AIzaSyC0fega_fYa7UvmoADJ0Q4WEwxOqbZ9q_0',
  authDomain: 'slq-firestore-test.firebaseapp.com',
  databaseURL: 'https://slq-firestore-test.firebaseio.com',
  projectId: 'slq-firestore-test',
  storageBucket: '',
  messagingSenderId: '444676513608'
});

const db = firebase.firestore();
db.settings({ timestampsInSnapshots: true });

// db.collection('cities').doc("SLC").set({
//   name: "Salt Lake City", state: 'UT', country: "USA",
//   capital: true, population: 3100000,
//   regions: ["no_idea"] });

const sqlFirestore = new FirestoreSQL(db);

const sqlQueries = [
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
  "SELECT * FROM cities WHERE country = 'USA' UNION SELECT * FROM cities WHERE country = 'Japan'",
];

const queries = sqlQueries.map(async sql => {
  console.log(sql);
  console.log(await sqlFirestore.query(sql));
  console.log('\n');
});

Promise.all(queries).then(() => process.exit());
