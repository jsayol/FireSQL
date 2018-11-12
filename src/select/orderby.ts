import { assert, prefixSuccessor } from '../utils';

export function applyOrderBy(
  queries: firebase.firestore.Query[],
  astOrderBy: any[]
): firebase.firestore.Query[] {
  astOrderBy.forEach(orderBy => {
    assert(
      orderBy.expr.type === 'column_ref',
      'ORDER BY only supports ordering by field names.'
    );

    queries = queries.map(query =>
      query.orderBy(orderBy.expr.column, orderBy.type.toLowerCase())
    );
  });

  return queries;
}

export function applyOrderByLocally(
  docs: firebase.firestore.DocumentData[],
  astOrderBy: any[]
): firebase.firestore.DocumentData[] {
  return docs.sort((doc1, doc2) => {
    return astOrderBy.reduce<number>((result, orderBy) => {
      if (result !== 0) {
        // We already found a way to sort these 2 documents, so there's
        // no need to keep going. This doesn't actually break out of the
        // reducer but prevents doing any further unnecessary and
        // potentially expensive comparisons.
        return result;
      }

      const field = orderBy.expr.column;

      if (doc1[field] < doc2[field]) {
        result = -1;
      } else if (doc1[field] > doc2[field]) {
        result = 1;
      } else {
        result = 0;
      }

      if (orderBy.type === 'DESC' && result !== 0) {
        result = -result;
      }

      return result;
    }, 0);
  });
}
