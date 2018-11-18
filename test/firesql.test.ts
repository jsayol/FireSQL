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

  it('is instantiable with a document path', () => {
    expect(new FireSQL('testing/doc')).toBeInstanceOf(FireSQL);
  });

  it('is instantiable with a DocumentReference', () => {
    expect(new FireSQL(firestore.doc('testing/doc'))).toBeInstanceOf(FireSQL);
  });

  it('has query() method', () => {
    expect(typeof new FireSQL().query).toBe('function');
  });

  it("doesn't have rxQuery() method", () => {
    // We haven't imported "firesql/rx" so rxQuery shouldn't exist
    expect((new FireSQL() as any).rxQuery).toBeUndefined();
  });
});
