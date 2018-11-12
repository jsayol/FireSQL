// Import here Polyfills if needed. Recommended core-js (npm i -D core-js)
// import "core-js/fn/array.find"
// ...

import { parse as parseSQL, ASTObject } from 'node-sqlparser';
import firebase from 'firebase/app';
import 'firebase/firestore';
import { executeSelect } from './select';

export default class FirestoreSQL {
  constructor(
    private ref:
      | firebase.firestore.Firestore
      | firebase.firestore.DocumentReference
  ) {}

  query(sql: string, asList?: boolean): Promise<any>;
  query<T>(sql: string, asList?: boolean): Promise<T>;
  async query<T>(sql: string, asList = true): Promise<T | any> {
    const ast: ASTObject = parseSQL(sql);

    if (ast.type === 'select') {
      return executeSelect(this.ref, ast);
    } else {
      throw new Error('Only SELECT statements are supported.');
    }
  }
}
