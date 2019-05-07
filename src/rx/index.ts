import { parse as parseSQL, SQL_Select } from 'node-sqlparser';
import { Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { collectionData } from 'rxfire/firestore';
import { FireSQL, QueryOptions, DOCUMENT_KEY_NAME } from '../firesql';
import { SelectOperation } from '../select';
import { assert, DocumentData, contains } from '../utils';

declare module '../firesql' {
  interface FireSQL {
    rxQuery(sql: string, options?: QueryOptions): Observable<DocumentData[]>;
    rxQuery<T>(sql: string, options?: QueryOptions): Observable<T[]>;
  }

  /**
   * @deprecated
   */
  interface FirestoreSQL {
    rxQuery(sql: string, options?: QueryOptions): Observable<DocumentData[]>;
    rxQuery<T>(sql: string, options?: QueryOptions): Observable<T[]>;
  }
}

FireSQL.prototype.rxQuery = function<T>(
  sql: string,
  options?: QueryOptions
): Observable<T[] | DocumentData[]> {
  assert(
    typeof sql === 'string' && sql.length > 0,
    'rxQuery() expects a non-empty string.'
  );
  const ast = parseSQL(sql);
  assert(ast.type === 'select', 'Only SELECT statements are supported.');
  return rxSelect((this as any)._getRef(), ast, {
    ...(this as any)._options,
    ...options
  });
};

function rxSelect(
  ref: firebase.firestore.DocumentReference,
  ast: SQL_Select,
  options: QueryOptions
): Observable<firebase.firestore.DocumentData[]> {
  const selectOp = new SelectOperation(ref, ast, options);
  let queries = selectOp.generateQueries_();

  if (ast._next) {
    assert(
      ast._next.type === 'select',
      ' UNION statements are only supported between SELECTs.'
    );
    // This is the UNION of 2 SELECTs, so lets process the second
    // one and merge their queries
    queries = queries.concat(selectOp.generateQueries_(ast._next));

    // FIXME: The SQL parser incorrectly attributes ORDER BY to the second
    // SELECT only, instead of to the whole UNION. Find a workaround.
  }

  let idField: string;
  let keepIdField: boolean;

  if (selectOp._includeId === true) {
    idField = DOCUMENT_KEY_NAME;
    keepIdField = true;
  } else if (typeof selectOp._includeId === 'string') {
    idField = selectOp._includeId;
    keepIdField = true;
  } else {
    idField = DOCUMENT_KEY_NAME;
    keepIdField = false;
  }

  const rxData = combineLatest(
    queries.map(query =>
      collectionData<firebase.firestore.DocumentData>(query, idField)
    )
  );

  return rxData.pipe(
    map((results: firebase.firestore.DocumentData[][]) => {
      // We have an array of results (one for each query we generated) where
      // each element is an array of documents. We need to flatten them.
      const documents: firebase.firestore.DocumentData[] = [];
      const seenDocuments: { [id: string]: true } = {};

      for (const docs of results) {
        for (const doc of docs) {
          // Note: for now we're only allowing to query a single collection, but
          // if at any point we change that (for example with JOINs) we'll need to
          // use the full document path here instead of just its ID
          if (!contains(seenDocuments, doc[idField])) {
            seenDocuments[doc[idField]] = true;
            if (!keepIdField) {
              delete doc[idField];
            }
            documents.push(doc);
          }
        }
      }

      return documents;
    }),
    map((documents: firebase.firestore.DocumentData[]) => {
      return selectOp.processDocuments_(queries, documents);
    })
  );
}
