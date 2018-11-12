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

      assert(
        ast.from.length === 1,
        'Only one collection at a time (no JOINs yet).'
      );

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
      assert(
        astWhere.left.type === 'column_ref',
        'Unsupported WHERE type on left side.'
      );
      assert(
        astWhere.right.type === 'expr_list',
        'Unsupported WHERE type on right side.'
      );

      const newQueries: firebase.firestore.Query[] = [];
      astWhere.right.value.forEach((valueObj: ASTWhereValue) => {
        newQueries.push(
          ...applyWhereToQueries(queries, astWhere.left.column, '=', valueObj)
        );
      });
      queries = newQueries;
    } else if (astWhere.operator === 'LIKE') {
      assert(
        astWhere.left.type === 'column_ref',
        'Unsupported WHERE type on left side.'
      );
      assert(
        astWhere.right.type === 'string',
        'Only strings are supported with LIKE in WHERE clause.'
      );

      const whereLike = parseWhereLike(astWhere.right.value);

      if (whereLike.equals !== void 0) {
        queries = applyWhereToQueries(
          queries,
          astWhere.left.column,
          '=',
          whereLike.equals
        );
      } else if (whereLike.beginsWith !== void 0) {
        const successorStr = prefixSuccessor(whereLike.beginsWith.value);
        queries = applyWhereToQueries(
          queries,
          astWhere.left.column,
          '>=',
          whereLike.beginsWith
        );
        queries = applyWhereToQueries(
          queries,
          astWhere.left.column,
          '<',
          stringASTWhereValue(successorStr)
        );
      } else {
        throw new Error(
          'Only terms in the form of "value%" (string begins with value) and "value" (string equals value) are supported with LIKE in WHERE clause.'
        );
      }
    } else {
      assert(
        astWhere.left.type === 'column_ref',
        'Unsupported WHERE type on left side.'
      );

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
    console.log(`.where(${field},${operator},${value})`);
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

interface WhereLikeResult {
  beginsWith?: ASTWhereValue;
  endsWith?: ASTWhereValue;
  contains?: ASTWhereValue;
  equals?: ASTWhereValue;
}

function stringASTWhereValue(str: string): ASTWhereValue {
  return {
    type: 'string',
    value: str
  };
}

function parseWhereLike(str: string): WhereLikeResult {
  const result: WhereLikeResult = {};
  const strLength = str.length;

  if (str[0] === '%') {
    if (str[strLength - 1] === '%') {
      result.contains = stringASTWhereValue(str.substr(1, strLength - 2));
    } else {
      result.endsWith = stringASTWhereValue(str.substring(1));
    }
  } else if (str[strLength - 1] === '%') {
    result.beginsWith = stringASTWhereValue(str.substr(0, strLength - 2));
  } else {
    result.equals = stringASTWhereValue(str);
  }

  return result;
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

/**
 * Adapted from: https://github.com/firebase/firebase-ios-sdk/blob/14dd9dc2704038c3bf702426439683cee4dc941a/Firestore/core/src/firebase/firestore/util/string_util.cc#L23-L40
 * @param prefix
 */
function prefixSuccessor(prefix: string): string {
  // We can increment the last character in the string and be done
  // unless that character is 255 (0xff), in which case we have to erase the
  // last character and increment the previous character, unless that
  // is 255, etc. If the string is empty or consists entirely of
  // 255's, we just return the empty string.
  let limit = prefix;
  while (limit.length > 0) {
    const index = limit.length - 1;
    if (limit[index] === '\xff') {
      limit = limit.slice(0, -1);
    } else {
      limit =
        limit.substr(0, index) +
        String.fromCharCode(limit.charCodeAt(index) + 1);
      break;
    }
  }
  return limit;
}
