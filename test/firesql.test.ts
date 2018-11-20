import { FireSQL } from '../src/firesql';
import { initFirestore } from './helpers/utils';

let firestore: firebase.firestore.Firestore;

beforeAll(() => {
  firestore = initFirestore();
});

describe('FireSQL basic API', () => {
  it('is instantiable without arguments', () => {
    expect(new FireSQL()).toBeInstanceOf(FireSQL);
  });

  it('is instantiable with Firestore', () => {
    expect(new FireSQL(firestore)).toBeInstanceOf(FireSQL);
  });

  it('is instantiable with DocumentReference', () => {
    expect(new FireSQL(firestore.doc('testing/doc'))).toBeInstanceOf(FireSQL);
  });

  it('is instantiable with a document path', () => {
    expect(new FireSQL('testing/doc')).toBeInstanceOf(FireSQL);
  });

  it('is instantiable with just options', () => {
    const options = { includeId: true };
    const fireSQL = new FireSQL(options);

    expect(fireSQL).toBeInstanceOf(FireSQL);
    expect(fireSQL.options).toEqual(options);
    expect(() => fireSQL.ref).not.toThrow();
    expect(fireSQL.ref.path).toBe('');
  });

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

  it('is instantiable with a document path and options', () => {
    const options = { includeId: true };
    const fireSQL = new FireSQL('a/b', options);

    expect(fireSQL).toBeInstanceOf(FireSQL);
    expect(fireSQL.options).toEqual(options);
    expect(() => fireSQL.ref).not.toThrow();
    expect(fireSQL.ref.path).toBe('a/b');
  });

  it('has query() method', () => {
    expect(typeof new FireSQL().query).toBe('function');
  });

  it("doesn't have rxQuery() method", () => {
    // We haven't imported "firesql/rx" so rxQuery shouldn't exist
    expect((new FireSQL() as any).rxQuery).toBeUndefined();
  });
});
