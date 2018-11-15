import { parse as parseSQL, SQL_AST } from 'node-sqlparser';
import firebase from 'firebase/app';
import 'firebase/firestore';
import { select } from './select';
import { DocumentData } from './utils';

// Polyfills
import 'core-js/fn/array/includes';
import 'core-js/fn/number/is-nan';

export class FirestoreSQL {
  constructor(
    private ref:
      | firebase.firestore.Firestore
      | firebase.firestore.DocumentReference
  ) {}

  query(sql: string, asList?: boolean): Promise<DocumentData[]>;
  query<T>(sql: string, asList?: boolean): Promise<T[]>;
  async query<T>(sql: string, asList = true): Promise<T[] | DocumentData[]> {
    const ast = parseSQL(sql);

    if (ast.type === 'select') {
      return select(this.ref, ast);
    } else {
      throw new Error(
        `"${(ast.type as string).toUpperCase()}" statements are not supported.`
      );
    }
  }
}
