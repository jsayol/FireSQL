import { parse as parseSQL } from 'node-sqlparser';
import firebase from 'firebase/app';
import 'firebase/firestore';
import { select, generateQueries } from './select';
import { DocumentData, assert } from './utils';

// Polyfills
import 'core-js/fn/array/includes';
import 'core-js/fn/number/is-nan';

export class FireSQL {
  private _ref?: firebase.firestore.DocumentReference;
  private _path?: string;

  constructor(
    ref?:
      | string
      | firebase.firestore.Firestore
      | firebase.firestore.DocumentReference
  ) {
    if (typeof ref === 'object') {
      if (ref.constructor.name === 'DocumentReference') {
        this._ref = ref as firebase.firestore.DocumentReference;
      } else if (ref.constructor.name === 'Firestore') {
        this._ref = (ref as firebase.firestore.Firestore).doc('/');
      } else {
        throw new Error(
          'Parameter needs to be a Firestore reference or a path string to a document.'
        );
      }
    } else {
      if (typeof ref === 'string') {
        this._path = ref;
      }

      try {
        this._getRef();
      } catch (err) {
        // The default Firebase app hasn't been initialized yet.
        // No problem, we'll try again when the user launches
        // the first query.
      }
    }
  }

  get ref(): firebase.firestore.DocumentReference {
    return this._getRef();
  }

  get firestore(): firebase.firestore.Firestore {
    return this._getRef().firestore;
  }

  query(sql: string): Promise<DocumentData[]>;
  query<T>(sql: string): Promise<T[]>;
  async query<T>(sql: string): Promise<T[] | DocumentData[]> {
    assert(
      typeof sql === 'string' && sql.length > 0,
      'query() expects a non-empty string.'
    );
    const ast = parseSQL(sql);

    if (ast.type === 'select') {
      return select(this._getRef(), ast);
    } else {
      throw new Error(
        `"${(ast.type as string).toUpperCase()}" statements are not supported.`
      );
    }
  }

  generateQueries(sql: string): firebase.firestore.Query[] {
    const ast = parseSQL(sql);
    return generateQueries(this._getRef(), ast);
  }

  private _getRef(): firebase.firestore.DocumentReference {
    if (!this._ref) {
      try {
        const firestore = firebase.app().firestore();
        this._ref = firestore.doc(this._path !== void 0 ? this._path : '/');
      } catch (err) {
        console.error(err);
        throw new Error(
          'The default Firebase app has not been initialized yet.'
        );
      }
    }

    return this._ref;
  }
}

/**
 * @deprecated Class FirestoreSQL has been renamed FireSQL
 */
export class FirestoreSQL extends FireSQL {
  constructor(
    ref?:
      | string
      | firebase.firestore.Firestore
      | firebase.firestore.DocumentReference
  ) {
    console.warn(
      'DEPRECATED: Class FirestoreSQL has been renamed FireSQL.\n' +
        'Using "FirestoreSQL" will stop working in future releases, update your code accordingly.'
    );
    super(ref);
  }
}
