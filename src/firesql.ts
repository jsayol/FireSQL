// Import here Polyfills if needed. Recommended core-js (npm i -D core-js)
// import "core-js/fn/array.find"
// ...

import { parse as parseSQL, ASTObject } from 'node-sqlparser';
import firebase from 'firebase/app';
import 'firebase/firestore';
import { select } from './select';

export class FirestoreSQL {
  constructor(
    private ref:
      | firebase.firestore.Firestore
      | firebase.firestore.DocumentReference
  ) {}

  query(sql: string, asList?: boolean): Promise<DocumentData[]>;
  query<T>(sql: string, asList?: boolean): Promise<T[]>;
  async query<T>(sql: string, asList = true): Promise<T[] | DocumentData[]> {
    const ast: ASTObject = parseSQL(sql);

    if (ast.type === 'select') {
      return select(this.ref, ast);
    } else {
      throw new Error(
        `"${ast.type.toUpperCase()}" statements are not supported.`
      );
    }
  }
}

// This is just to make the code above more readable
export type DocumentData = firebase.firestore.DocumentData;
