import firebase from 'firebase/app';
import 'firebase/firestore';
import { parse as parseSQL } from 'node-sqlparser';
import { DocumentData, assert } from './utils';
import { select_ } from './select';

// Polyfills
import 'core-js/features/array/includes';
import 'core-js/features/number/is-nan';

export const DOCUMENT_KEY_NAME = '__name__';

export class FireSQL {
  private _ref?: firebase.firestore.DocumentReference;
  private _path?: string;
  private _options!: FireSQLOptions;

  constructor(
    refOrOptions?: FirestoreOrDocOrOptions,
    options?: FireSQLOptions
  ) {
    let hasSetOptions = false;

    if (typeof refOrOptions === 'object') {
      /*
       We initially used `instanceof` to determine the object type, but that
       only allowed using the client SDK. Doing it this way we can support
       both the client and the admin SDKs.
       */
      if (typeof (refOrOptions as any).doc === 'function') {
        // It's an instance of firebase.firestore.Firestore
        try {
          this._ref = (refOrOptions as firebase.firestore.Firestore).doc('/');
        } catch (err) {
          // If the Firestore instance we get is from the Admin SDK, it throws
          // an error if we call `.doc("/")` on it. In that case we just treat
          // it as a firebase.firestore.DocumentReference
          this._ref = refOrOptions as firebase.firestore.DocumentReference;
        }
      } else if (typeof (refOrOptions as any).collection === 'function') {
        // It's an instance of firebase.firestore.DocumentReference
        this._ref = refOrOptions as firebase.firestore.DocumentReference;
      } else if (!options) {
        // It's an options object
        // TODO: check it's a valid options object
        this._options = refOrOptions as FireSQLOptions;
        hasSetOptions = true;
      } else {
        throw new Error(
          'With options as the second parameter, the first parameter ' +
            'needs to be a path string or a Firestore reference.'
        );
      }
    } else {
      if (typeof refOrOptions === 'string') {
        this._path = refOrOptions;
      }
    }

    if (!hasSetOptions) {
      // TODO: check it's a valid options object
      this._options = options || {};
    }

    if (!this._ref) {
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

  get options(): FireSQLOptions {
    return this._options;
  }

  query(sql: string, options?: QueryOptions): Promise<DocumentData[]>;
  query<T>(sql: string, options?: QueryOptions): Promise<T[]>;
  async query<T>(
    sql: string,
    options: QueryOptions = {}
  ): Promise<T[] | DocumentData[]> {
    assert(
      typeof sql === 'string' && sql.length > 0,
      'query() expects a non-empty string.'
    );
    const ast = parseSQL(sql);

    if (ast.type === 'select') {
      return select_(this._getRef(), ast, { ...this._options, ...options });
    } else {
      throw new Error(
        `"${(ast.type as string).toUpperCase()}" statements are not supported.`
      );
    }
  }

  private _getRef(): firebase.firestore.DocumentReference {
    if (!this._ref) {
      try {
        const firestore = firebase.firestore();
        this._ref = firestore.doc(this._path !== void 0 ? this._path : '/');
        delete this._path;
      } catch (err) {
        console.error(err);
        throw new Error(
          'The default Firebase app has not been initialized yet.'
        );
      }
    }

    return this._ref;
  }

  toJSON(): object {
    return {
      ref: this._getRef(),
      options: this._options
    };
  }
}

export interface FireSQLOptions {
  includeId?: boolean | string;
}

export interface QueryOptions extends FireSQLOptions {}

type FirestoreOrDocument =
  | string
  | firebase.firestore.Firestore
  | firebase.firestore.DocumentReference
  | AdminFirestore
  | AdminDocumentReference;

export type FirestoreOrDocOrOptions = FirestoreOrDocument | FireSQLOptions;

/**
 * An interface representing the basics we need from the
 * admin.firestore.Firestore class.
 * We use it like this to avoid having to require "firebase-admin".
 */
interface AdminFirestore {
  collection(collectionPath: string): any;
  doc(documentPath: string): any;
}

/**
 * An interface representing the basics we need from the
 * admin.firestore.DocumentReference class.
 * We use it like this to avoid having to require "firebase-admin".
 */
interface AdminDocumentReference {
  collection(collectionPath: string): any;
  get(options?: any): Promise<any>;
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
    super(ref as any);
  }
}
