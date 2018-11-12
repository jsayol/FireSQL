import SQLFirestore from '../src/sql-firestore';
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

const sqlFirestore = new SQLFirestore(db);

const sqlQueries = [
  // 'SELECT * FROM cities',
  // "SELECT * FROM cities WHERE state = 'CA'",
  // "SELECT * FROM cities WHERE country = 'USA' AND population > 700000",
  // "SELECT * FROM cities WHERE country = 'USA' OR country = 'China'",
  // "SELECT * FROM cities WHERE country = 'Japan' OR population < 1000000",
  // "SELECT * FROM cities WHERE country = 'Japan' OR population > 1000000",
  // "SELECT name, capital FROM cities WHERE country LIKE 'Chi%'",
  // "SELECT * FROM cities WHERE country = 'USA' AND (capital IS true OR population > 1000000)"
  // "SELECT * FROM cities WHERE country = 'USA' AND capital",
  // "SELECT * FROM cities WHERE country IN ('USA', 'Japan')",
  // "SELECT * FROM cities WHERE country IN ('USA', 'Japan') AND capital IS TRUE",
  "SELECT * FROM cities WHERE country != 'USA'",
];

const queries = sqlQueries.map(async sql => {
  console.log(sql);
  console.log(await sqlFirestore.query(sql));
  console.log('\n');
});

Promise.all(queries).then(() => process.exit());
