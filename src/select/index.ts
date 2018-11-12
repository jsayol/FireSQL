import { ASTObject } from 'node-sqlparser';
import { assert, contains } from '../utils';
import { applyWhere } from './where';
import { applyOrderBy, applyOrderByLocally } from './orderby';

export async function executeSelect(
  ref: firebase.firestore.Firestore | firebase.firestore.DocumentReference,
  ast: ASTObject
): Promise<firebase.firestore.DocumentData[]> {
  let selectFields: any[] | null;
  if (typeof ast.columns === 'string' && ast.columns === '*') {
    // Return all fields from the documents
    selectFields = null;
  } else if (Array.isArray(ast.columns)) {
    const columnsOK = ast.columns.every(astColumn => {
      return astColumn.expr.type === 'column_ref';
    });
    assert(!columnsOK, 'Only field names are supported in SELECT statements.');

    // TODO: support aggregate functions (SUM, AVG, COUNT?)
    // TODO: take aliases into account

    selectFields = ast.columns;
  } else {
    // We should never reach here
    throw new Error('Internal error (ast.columns).');
  }

  assert(
    ast.from.length === 1,
    'Only one collection at a time (no JOINs yet).'
  );

  const colName = ast.from[0].table;
  let collection = ref.collection(colName);
  let queries: firebase.firestore.Query[] = [collection];

  if (ast.where) {
    queries = applyWhere(queries, ast.where);
  }

  if (ast.orderby) {
    queries = applyOrderBy(queries, ast.orderby);
  }

  if (ast.groupby) {
    throw new Error('GROUP BY not supported yet');
  }

  if (ast.limit) {
    throw new Error('LIMIT not supported yet');
  }

  let results: firebase.firestore.DocumentData[] = [];
  const seenDocs: { [id: string]: true } = {};

  try {
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
  } catch (err) {
    // TODO: handle error?
    throw err;
  }

  if (ast.orderby && queries.length > 1) {
    // We merged more than one query into a single set of documents
    // so we need to order the documents again, this time client-side.
    results = applyOrderByLocally(results, ast.orderby);
  }

  if (ast._next) {
    assert(
      ast._next.type === 'select',
      ' UNION statements are only supported between SELECTs.'
    );
    // This query is the UNION of 2 queries, so lets process the second
    // one and merge the results
    const unionSelect = await executeSelect(ref, ast._next);
    results.push(...unionSelect);

    // FIXME: The SQL parser incorrectly attributes ORDER BY to the second
    // SELECT only, instead of to the whole UNION. Find a workaround.
  }

  return results;
}
