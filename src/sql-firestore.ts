// Import here Polyfills if needed. Recommended core-js (npm i -D core-js)
// import "core-js/fn/array.find"
// ...

import { parse as parseSQL, ASTObject } from 'node-sqlparser';
import firebase from 'firebase/app';
import 'firebase/firestore';

function whereOpConversion(op: string): firebase.firestore.WhereFilterOp {
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
    case 'CONTAINS':
      // array-contains
      throw new Error('"CONTAINS" WHERE operator unsupported');
      break;
    case 'NOT':
    case 'NOT CONTAINS':
      throw new Error('"NOT" WHERE operator unsupported');
      break;
    default:
      throw new Error('Unknown WHERE operator');
  }

  return newOp;
}

function applyWhere(
  queries: firebase.firestore.Query[],
  astWhere: { [k: string]: any }
): firebase.firestore.Query[] {
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

  const operator = whereOpConversion(astWhere.operator);
  console.log(
    `.where(${astWhere.left.column}, ${operator}, ${astWhere.right.value})`
  );
  queries = queries.map(query =>
    query.where(astWhere.left.column, operator, value)
  );

  return queries;
}

export default class SQLFirestore {
  constructor(
    private db:
      | firebase.firestore.Firestore
      | firebase.firestore.DocumentReference
  ) {}

  query(sql: string, asList?: boolean): Promise<any>;
  query<T>(sql: string, asList?: boolean): Promise<T>;
  async query<T>(sql: string, asList = true): Promise<T | any> {
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
      let collection = this.db.collection(colName) as firebase.firestore.Query;
      let queries: firebase.firestore.Query[] = [];

      if (ast.where) {
        if (ast.where.type !== 'binary_expr') {
          throw new Error('Unsupported WHERE clause');
        }

        if (ast.where.operator === 'AND') {
          queries = applyWhere([collection], ast.where.left);
          queries = applyWhere(queries, ast.where.right);
        } else if (ast.where.operator === 'OR') {
          // throw new Error('OR oeprator not supported in WHERE clause.');
          queries = [
            ...applyWhere([collection], ast.where.left),
            ...applyWhere([collection], ast.where.right)
          ];
        } else {
          queries = applyWhere([collection], ast.where);
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

      let results: firebase.firestore.DocumentData[] = [];
      const seenDocs: { [id: string]: true } = {};

      await Promise.all(
        queries.map(async query => {
          const snapshot = await query.get();
          const numDocs = snapshot.docs.length;

          for (let i = 0; i < numDocs; i++) {
            const doc = snapshot.docs[i];
            if (!Object.prototype.hasOwnProperty.call(seenDocs, doc.ref.path)) {
              results.push(doc.data());
              seenDocs[doc.ref.path] = true;
            }
          }
        })
      );

      return results;
    } else {
      throw new Error('Only SELECT statements are supported.');
    }
  }

  private parse_(sql: string): ASTObject {
    return parseSQL(sql);
  }
}
