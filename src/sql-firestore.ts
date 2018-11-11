// Import here Polyfills if needed. Recommended core-js (npm i -D core-js)
// import "core-js/fn/array.find"
// ...

import { parse as parseSQL, ASTObject } from 'node-sqlparser';
import firebase from 'firebase/app';
import 'firebase/firestore';

export default class SQLFirestore {
  constructor(
    private db?:
      | firebase.firestore.Firestore
      | firebase.firestore.DocumentReference
  ) {}

  query(sql: string): Promise<any>;
  query<T>(sql: string): Promise<T>;
  query<T>(sql: string): Promise<T | any> {
    const ast = this.parse(sql);

    return Promise.resolve<T>((void 0 as any) as T);
  }

  parse(sql: string): ASTObject {
    return parseSQL(sql);
  }
}
