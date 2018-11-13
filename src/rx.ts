import { parse as parseSQL, ASTObject } from 'node-sqlparser';
import { Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { collectionData } from 'rxfire/firestore';
import { FirestoreSQL, DocumentData } from './firesql';
import { generateQueries, processDocuments } from './select';
import { assert } from './utils';

declare module './firesql' {
  interface FirestoreSQL {
    rxQuery(sql: string): Observable<DocumentData[]>;
    rxQuery<T>(sql: string): Observable<T[]>;
  }
}

FirestoreSQL.prototype.rxQuery = function<T>(
  sql: string
): Observable<T[] | DocumentData[]> {
  const ast: ASTObject = parseSQL(sql);
  assert(ast.type === 'select', 'Only SELECT statements are supported.');
  return rxSelect((this as any).ref, ast);
};

function rxSelect(
    ref: firebase.firestore.Firestore | firebase.firestore.DocumentReference,
    ast: ASTObject
  ): Observable<firebase.firestore.DocumentData[]> {
    let queries = generateQueries(ref, ast);
  
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
  
    const rxData = combineLatest(queries.map(query => collectionData(query)));
  
    return rxData.pipe(
      map((results: firebase.firestore.DocumentData[][]) => {
        // We have an array of results (one for each query we generated) where
        // each element is an array of documents. We need to flatten them.
        return results.reduce((docs, current) => docs.concat(current), []);
      }),
      map((documents: firebase.firestore.DocumentData[]) => {
        return processDocuments(ast, queries, documents);
      })
    );
  }
  