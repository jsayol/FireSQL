// Import here Polyfills if needed. Recommended core-js (npm i -D core-js)
// import "core-js/fn/array.find"
// ...

import { parse as parseSQL, ASTObject } from 'node-sqlparser';
import firebase from 'firebase/app';
import 'firebase/firestore';

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
      let collection = this.db.collection(colName);
      let queries: firebase.firestore.Query[] = [collection];

      if (ast.where) {
        queries = applyCondition(queries, ast.where);
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
            if (!contains(seenDocs, doc.ref.path)) {
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

function applyCondition(
  queries: firebase.firestore.Query[],
  astWhere: { [k: string]: any }
): firebase.firestore.Query[] {
  if (astWhere.type === 'binary_expr') {
    if (astWhere.operator === 'AND') {
      queries = applyCondition(queries, astWhere.left);
      queries = applyCondition(queries, astWhere.right);
    } else if (astWhere.operator === 'OR') {
      queries = [
        ...applyCondition(queries, astWhere.left),
        ...applyCondition(queries, astWhere.right)
      ];
    } else if (astWhere.operator === 'IN') {
      if (astWhere.left.type !== 'column_ref') {
        throw new Error('Unsupported WHERE type on left side.');
      }
      if (astWhere.right.type !== 'expr_list') {
        throw new Error('Unsupported WHERE type on right side.');
      }

      const newQueries: firebase.firestore.Query[] = [];
      astWhere.right.value.forEach((valueObj: ASTWhereValue) => {
        newQueries.push(
          ...applyWhereToQueries(queries, astWhere.left.column, '=', valueObj)
        );
      });
      queries = newQueries;
    } else {
      if (astWhere.left.type !== 'column_ref') {
        throw new Error('Unsupported WHERE type on left side.');
      }

      queries = applyWhereToQueries(
        queries,
        astWhere.left.column,
        astWhere.operator,
        astWhere.right
      );
    }
  } else if (astWhere.type === 'column_ref') {
    // The query is like "... WHERE column_name", so lets return
    // the documents where "column_name" is true. Ideally we would
    // include any document where "column_name" is truthy, but there's
    // no way to do that with Firestore.
    queries = queries.map(query => query.where(astWhere.column, '==', true));
  } else {
    throw new Error('Unsupported WHERE clause');
  }

  return queries;
}

function applyWhereToQueries(
  queries: firebase.firestore.Query[],
  field: string,
  astOperator: string,
  astValue: ASTWhereValue
): firebase.firestore.Query[] {
  let value: boolean | string | number | null;

  switch (astValue.type) {
    case 'bool':
    case 'null':
    case 'string':
      value = astValue.value;
      break;
    case 'number':
      value = Number(astValue.value);
      break;
    default:
      throw new Error('Unsupported value type in WHERE clause.');
  }

  if (astOperator === '!=' || astOperator === '<>') {
    // The != operator is not supported in Firestore so we
    // split this query in two, one with the < operator and
    // another one with the > operator.
    return [
      ...applyWhereToQueries(queries, field, '<', astValue),
      ...applyWhereToQueries(queries, field, '>', astValue)
    ];
  } else {
    const operator = whereFilterOp(astOperator);
    return queries.map(query => query.where(field, operator, value));
  }
}

function whereFilterOp(op: string): firebase.firestore.WhereFilterOp {
  let newOp: firebase.firestore.WhereFilterOp;

  switch (op) {
    case '=':
    case 'IS':
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

function contains(obj: object, prop: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

interface ASTWhereValue {
  type: string;
  value: any;
}
