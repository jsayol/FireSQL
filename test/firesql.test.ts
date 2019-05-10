// import admin from 'firebase-admin';
import firebase from 'firebase/app';
import { FireSQL } from '../src/firesql';
import { initFirestore/*, initAdminFirestore*/ } from './helpers/utils';

let firestore: firebase.firestore.Firestore;
// let adminFirestore: admin.firestore.Firestore;

beforeAll(() => {
  firestore = initFirestore();
  // adminFirestore = initAdminFirestore();
});

describe('FireSQL basic API', () => {
  it('is instantiable with Firestore', () => {
    expect(new FireSQL(firestore)).toBeInstanceOf(FireSQL);
  });

  it('is instantiable with DocumentReference', () => {
    expect(new FireSQL(firestore.doc('testing/doc'))).toBeInstanceOf(FireSQL);
  });

  // it('is instantiable with firebase-admin Firestore', () => {
  //   expect(new FireSQL(adminFirestore)).toBeInstanceOf(FireSQL);
  // });

  // it('is instantiable with firebase-admin DocumentReference', () => {
  //   expect(new FireSQL(adminFirestore.doc('testing/doc'))).toBeInstanceOf(
  //     FireSQL
  //   );
  // });

  it('is instantiable with Firestore and options', () => {
    const options = { includeId: true };
    const fireSQL = new FireSQL(firestore, options);

    expect(fireSQL).toBeInstanceOf(FireSQL);
    expect(fireSQL.options).toEqual(options);
    expect(() => fireSQL.ref).not.toThrow();
    expect(fireSQL.ref.path).toBe('');
  });

  it('is instantiable with DocumentReference and options', () => {
    const options = { includeId: true };
    const docRef = firestore.doc('a/b');
    const fireSQL = new FireSQL(docRef, options);

    expect(fireSQL).toBeInstanceOf(FireSQL);
    expect(fireSQL.options).toEqual(options);
    expect(() => fireSQL.ref).not.toThrow();
    expect(fireSQL.ref.path).toBe('a/b');
  });

  // it('is instantiable with firebase-admin Firestore and options', () => {
  //   const options = { includeId: true };
  //   const fireSQL = new FireSQL(adminFirestore, options);

  //   expect(fireSQL).toBeInstanceOf(FireSQL);
  //   expect(fireSQL.options).toEqual(options);
  //   expect(() => fireSQL.ref).not.toThrow();
  //   expect(fireSQL.ref.path).toBe('');
  // });

  // it('is instantiable with firebase-admin DocumentReference and options', () => {
  //   const options = { includeId: true };
  //   const docRef = adminFirestore.doc('a/b');
  //   const fireSQL = new FireSQL(docRef, options);

  //   expect(fireSQL).toBeInstanceOf(FireSQL);
  //   expect(fireSQL.options).toEqual(options);
  //   expect(() => fireSQL.ref).not.toThrow();
  //   expect(fireSQL.ref.path).toBe('a/b');
  // });

  it('has query() method', () => {
    expect(typeof new FireSQL(firestore).query).toBe('function');
  });

  it("doesn't have rxQuery() method", () => {
    // We haven't imported "firesql/rx" so rxQuery shouldn't exist
    expect((new FireSQL(firestore) as any).rxQuery).toBeUndefined();
  });
});
