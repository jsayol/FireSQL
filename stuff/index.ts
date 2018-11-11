import { parse as parseSQL, ASTObject } from 'node-sqlparser';
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

const sqlQueries = [
  // 'SELECT * FROM cities'
  // "SELECT * FROM cities WHERE state = 'CA'"
  "SELECT name FROM cities WHERE country = 'USA' AND population > 700000"
  // "SELECT name, capital FROM cities WHERE country LIKE 'Chi%'"
];

sqlQueries.forEach(async sql => {
  const ast: ASTObject = parseSQL(sql);
  // console.log(JSON.stringify(ast, null, 2));

  if (ast.type === 'select') {
    if (typeof ast.columns === 'string') {
      // if (ast.columns === '*') {
      // } else {
      //   throw new Error('WTF?');
      // }
    } else {
      // TODO
    }

    if (ast.from.length > 1) {
      throw new Error('Only one collection at a time (no JOINs yet).');
    }

    const colName = ast.from[0].table;
    let query = db.collection(colName) as firebase.firestore.Query;

    if (ast.where) {
      if (ast.where.type !== 'binary_expr') {
        throw new Error('Unsupported WHERE clause');
      }

      if (ast.where.operator === 'OR') {
        throw new Error('OR oeprator not supported in WHERE clause.');
      }

      if (ast.where.operator === 'AND') {
        query = applyWhere(query, ast.where.left);
        query = applyWhere(query, ast.where.right);
      } else {
        query = applyWhere(query, ast.where);
      }
    }

    if (ast.orderby) {
      throw new Error('ORDER BY not supported yet');
    }

    if (ast.groupby) {
      throw new Error('GROUP BY not supported yet');
    }

    if (ast.limit) {
      throw new Error('LIMIT not supported yet');
    }

    const snapshot = await query.get();

    console.log(sql);
    console.log(snapshot.docs.map(doc => doc.data()));
    console.log('\n');
  } else {
    throw new Error('Only SELECT statements are supported.');
  }
});

function whereOperatorConversion(op: string): firebase.firestore.WhereFilterOp {
  let newOp: firebase.firestore.WhereFilterOp;

  switch (op) {
    case '=':
      newOp = '==';
      break;
    case '<':
    case '<=':
    case '>':
    case '>=':
      newOp = op;
      break;
    default:
      throw new Error('Unknown WHERE operator');
  }

  return newOp;
}

function applyWhere(
  query: firebase.firestore.Query,
  astWhere: { [k: string]: any }
): firebase.firestore.Query {
  if (astWhere.left.type !== 'column_ref') {
    throw new Error('Unsupported WHERE type on left side.');
  }

  let value: string | number;

  switch (astWhere.right.type) {
    case 'string':
      value = astWhere.right.value;
      break;
    case 'number':
      value = Number(astWhere.right.value);
      break;
    default:
      throw new Error('Unsupported value type in WHERE clause.');
  }

  const operator = whereOperatorConversion(astWhere.operator);
  console.log(
    `.where(${astWhere.left.column}, ${operator}, ${astWhere.right.value})`
  );
  query = query.where(astWhere.left.column, operator, value);

  return query;
}
