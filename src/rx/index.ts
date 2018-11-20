import { parse as parseSQL, SQL_Select } from 'node-sqlparser';
import { Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { collectionData } from 'rxfire/firestore';
import { FireSQL, QueryOptions, DOCUMENT_KEY_NAME } from '../firesql';
import { SelectOperation } from '../select';
import { assert, DocumentData } from '../utils';

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

  let rxFireIdField: string | undefined;
  if (selectOp._includeId === true) {
    rxFireIdField = DOCUMENT_KEY_NAME;
  } else if (typeof selectOp._includeId === 'string') {
    rxFireIdField = selectOp._includeId;
  }

  const rxData = combineLatest(
    queries.map(query => collectionData(query, rxFireIdField))
  );

  return rxData.pipe(
    map((results: firebase.firestore.DocumentData[][]) => {
      // We have an array of results (one for each query we generated) where
      // each element is an array of documents. We need to flatten them.
      return results.reduce((docs, current) => docs.concat(current), []);
    }),
    map((documents: firebase.firestore.DocumentData[]) => {
      return selectOp.processDocuments_(queries, documents);
    })
  );
}
