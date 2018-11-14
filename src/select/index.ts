import {
  ASTObject,
  ASTSelectColumn,
  ASTExpression,
  ASTColumnRef
} from 'node-sqlparser';
import { assert, contains, deepGet } from '../utils';
import { applyWhere } from './where';
import { applyGroupByLocally } from './groupby';
import { applyOrderBy, applyOrderByLocally } from './orderby';
import { applyLimit, applyLimitLocally } from './limit';

export async function select(
  ref: firebase.firestore.Firestore | firebase.firestore.DocumentReference,
  ast: ASTObject
): Promise<firebase.firestore.DocumentData[]> {
  const queries = generateQueries(ref, ast);
  const documents = await executeQueries(queries);
  return processDocuments(ast, queries, documents);
}

export function generateQueries(
  ref: firebase.firestore.Firestore | firebase.firestore.DocumentReference,
  ast: ASTObject
): firebase.firestore.Query[] {
  assert(
    ast.from.length === 1,
    'Only one collection at a time (no JOINs yet).'
  );

  const colName = ast.from[0].table;
  let collection = ref.collection(colName);
  let queries: firebase.firestore.Query[] = [collection];

  /*
 * We'd need this if we end up implementing JOINs, but for now
 * it's unnecessary since we're only querying a single collection
 
  // Keep track of aliased "tables" (collections)
  const aliasedCollections: { [k: string]: string } = {};
  if (ast.from[0].as.length > 0) {
    aliasedCollections[ast.from[0].as] = colName;
  } else {
    aliasedCollections[colName] = colName;
  }
 */

  if (ast.where) {
    queries = applyWhere(queries, ast.where);
  }

  if (ast.orderby) {
    queries = applyOrderBy(queries, ast.orderby);
  }

  // if (ast.groupby) {
  //   throw new Error('GROUP BY not supported yet');
  // }

  if (ast.limit) {
    // First we apply the limit to each query we may have
    // and later we'll apply it again locally to the
    // merged set of documents, in case we end up with too many.
    queries = applyLimit(queries, ast.limit);
  }

  if (ast._next) {
    assert(
      ast._next.type === 'select',
      ' UNION statements are only supported between SELECTs.'
    );
    // This is the UNION of 2 SELECTs, so lets process the second
    // one and merge their queries
    queries = queries.concat(generateQueries(ref, ast._next));

    // FIXME: The SQL parser incorrectly attributes ORDER BY to the second
    // SELECT only, instead of to the whole UNION. Find a workaround.
  }

  return queries;
}

async function executeQueries(
  queries: firebase.firestore.Query[]
): Promise<firebase.firestore.DocumentData[]> {
  let documents: firebase.firestore.DocumentData[] = [];
  const seenDocs: { [id: string]: true } = {};

  try {
    await Promise.all(
      queries.map(async query => {
        const snapshot = await query.get();
        const numDocs = snapshot.docs.length;

        for (let i = 0; i < numDocs; i++) {
          const doc = snapshot.docs[i];
          if (!contains(seenDocs, doc.ref.path)) {
            documents.push(doc.data());
            seenDocs[doc.ref.path] = true;
          }
        }
      })
    );
  } catch (err) {
    // TODO: handle error?
    throw err;
  }

  return documents;
}

export function processDocuments(
  ast: ASTObject,
  queries: firebase.firestore.Query[],
  documents: firebase.firestore.DocumentData[]
): firebase.firestore.DocumentData[] {
  if (ast.groupby) {
    const groupedDocs = applyGroupByLocally(documents, ast.groupby);
    // TODO: finish this
  }

  if (ast.orderby && queries.length > 1) {
    // We merged more than one query into a single set of documents
    // so we need to order the documents again, this time client-side.
    documents = applyOrderByLocally(documents, ast.orderby);
  }

  if (ast.limit && queries.length > 1) {
    // We merged more than one query into a single set of documents
    // so we need to apply the limit again, this time client-side.
    documents = applyLimitLocally(documents, ast.limit);
  }

  if (typeof ast.columns === 'string' && ast.columns === '*') {
    // Return all fields from the documents
  } else if (Array.isArray(ast.columns)) {
    // TODO: support aggregate functions (MIN, MAX, SUM, AVG, COUNT, ...)
    const columnsOK = ast.columns.every(astColumn => {
      return astColumn.expr.type === 'column_ref';
    });
    assert(columnsOK, 'Only field names are supported in SELECT statements.');

    // Only include the requested fields from the documents
    documents = documents.map(doc => {
      return ast.columns.reduce(
        (newDoc: firebase.firestore.DocumentData, column: ASTSelectColumn) => {
          const fieldName = (column.expr as ASTColumnRef).column;
          const fieldAlias =
            column.as !== null && column.as.length > 0 ? column.as : fieldName;
          newDoc[fieldAlias] = deepGet(doc, fieldName);
          return newDoc;
        },
        {}
      );
    });
  } else {
    // We should never reach here
    throw new Error('Internal error (ast.columns).');
  }

  return documents;
}
