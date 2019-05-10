import { assert, astValueToNative } from '../utils';
import { SQL_Value } from '../sql-parser';

export function applyLimit(
  queries: firebase.firestore.Query[],
  astLimit: SQL_Value
): firebase.firestore.Query[] {
  assert(
    astLimit.type === 'number',
    "LIMIT has to be a number."
  );
  const limit = astValueToNative(astLimit) as number;
  return queries.map(query => query.limit(limit));
}

export function applyLimitLocally(
  docs: firebase.firestore.DocumentData[],
  astLimit: SQL_Value
): firebase.firestore.DocumentData[] {
  const limit = astValueToNative(astLimit) as number;
  docs.splice(limit);
  return docs;
}
