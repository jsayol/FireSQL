import { assert, prefixSuccessor, astValueToNative } from '../utils';

export function applyLimit(
  queries: firebase.firestore.Query[],
  astLimit: any[]
): firebase.firestore.Query[] {
  // node-sqlparser's implementation of LIMIT is a bit buggy.
  // If limit and offset are passed, it returns an array where
  // the first item is the limit and the second one is the
  // offset, but if no offset is specified then the first item
  // in the array is the number 0 and the second one contains
  // the actual limit.
  // Plus, it throws an error if there's a newline character
  // following the limit.
  assert(
    astLimit[0].value === 0,
    "LIMIT doesn't support specifying an OFFSET."
  );
  const limit = astValueToNative(astLimit[1]) as number;
  return queries.map(query => query.limit(limit));
}

export function applyLimitLocally(
  docs: firebase.firestore.DocumentData[],
  astLimit: any[]
): firebase.firestore.DocumentData[] {
  const limit = astValueToNative(astLimit[1]) as number;
  docs.splice(limit);
  return docs;
}
