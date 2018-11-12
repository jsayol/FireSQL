import { FirestoreSQL } from '../src/firesql';
import firebase from 'firebase/app';
import 'firebase/firestore';

firebase.initializeApp({
  apiKey: 'AIzaSyBvghzVWT1--IYJXd7oE5ahKyr9IQbe5U4',
  authDomain: 'firestore-sql-test.firebaseapp.com',
  databaseURL: 'https://firestore-sql-test.firebaseio.com',
  projectId: 'firestore-sql-test',
  storageBucket: 'firestore-sql-test.appspot.com',
  messagingSenderId: '661325537272'
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
  // "SELECT * FROM cities WHERE country = 'USA' UNION SELECT * FROM cities WHERE country = 'Japan'",
  // "SELECT * FROM cities WHERE country = 'Japan' OR country = 'USA' LIMIT 3",
  // "SELECT name AS city, population AS people FROM cities WHERE country = 'USA'"

  'SELECT * FROM restaurants',
  // "SELECT * FROM restaurants WHERE city='Chicago'",
  // "SELECT * FROM restaurants WHERE category='Indian' AND price < 50",
  // "SELECT * FROM restaurants WHERE name LIKE 'Best%'",
  // "SELECT * FROM restaurants WHERE name LIKE 'Best%' OR city='Los Angeles'",
  // "SELECT * FROM restaurants WHERE city IN ('Raleigh', 'Nashvile', 'Denver')",
  // "SELECT * FROM restaurants WHERE city != 'Oklahoma'",
  // 'SELECT * FROM restaurants WHERE favorite',
  // 'SELECT * FROM restaurants WHERE favorite=true',
  // 'SELECT * FROM restaurants WHERE favorite IS NULL',
  // "SELECT * FROM restaurants WHERE city='Memphis' AND (price < 40 OR avgRating > 8) ORDER BY price DESC, avgRating",
  // 'SELECT * FROM restaurants WHERE price BETWEEN 25 AND 150 ORDER BY city, price LIMIT 10',
  // "SELECT * FROM restaurants WHERE city='Chicago' UNION SELECT * FROM restaurants WHERE price > 200"
];

const queries = sqlQueries.map(async sql => {
  console.log(sql);
  console.log(await sqlFirestore.query(sql));
  console.log('\n');
});

Promise.all(queries).then(() => process.exit());
