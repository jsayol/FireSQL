import { parse as parseSQL } from 'node-sqlparser';
import firebase from 'firebase/app';
import 'firebase/firestore';
import { DocumentData, assert } from './utils';
import { select_ } from './select';

// Polyfills
import 'core-js/fn/array/includes';
import 'core-js/fn/number/is-nan';

export const DOCUMENT_KEY_NAME = '__name__';

export class FireSQL {
  private _ref?: firebase.firestore.DocumentReference;
  private _path?: string;
  private _options: FireSQLOptions;

  constructor(
    refOrOptions?: FirestoreOrDocOrOptions,
    options?: FireSQLOptions
  ) {
    this._options = options as FireSQLOptions;

    if (typeof refOrOptions === 'object') {
      if (refOrOptions.constructor.name === 'DocumentReference') {
        this._ref = refOrOptions as firebase.firestore.DocumentReference;
      } else if (refOrOptions.constructor.name === 'Firestore') {
        this._ref = (refOrOptions as firebase.firestore.Firestore).doc('/');
      } else if (!options) {
        this._options = refOrOptions as FireSQLOptions;
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

    if (!this._options) {
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
        const firestore = firebase.app().firestore();
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

export type FirestoreOrDocument =
  | string
  | firebase.firestore.Firestore
  | firebase.firestore.DocumentReference;

export type FirestoreOrDocOrOptions = FirestoreOrDocument | FireSQLOptions;

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
