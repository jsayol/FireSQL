import * as admin from 'firebase-admin';

export async function loadTestDataset(
  firestore: admin.firestore.Firestore,
  data: TestCollection[]
): Promise<any> {
  // TODO
  console.log('Loading test data ...');

  if (!Array.isArray(data)) {
    throw new Error('Test data needs to be an array of collections.');
  }

  for (let collection of data) {
    await loadCollection(firestore, collection);
  }
}

function loadCollection(
  docRef: admin.firestore.Firestore | admin.firestore.DocumentReference,
  col: TestCollection
): Promise<any> {
  const colRef = docRef.collection(col.collection);
  return Promise.all(col.docs.map(doc => loadDocument(colRef, doc)));
}

function loadDocument(
  colRef: admin.firestore.CollectionReference,
  doc: TestDocument
): Promise<any> {
  const docRef = colRef.doc(doc.key);

  return Promise.all([
    docRef.set(flattenObject(doc.data)),
    ...(doc.collections || []).map(col => loadCollection(docRef, col))
  ]);
}

interface TestCollection {
  collection: string;
  docs: TestDocument[];
}

interface TestDocument {
  key: string;
  data: { [k: string]: any };
  collections: TestCollection[];
}

export function contains(obj: object, prop: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

export function flattenObject(obj: { [k: string]: any }): typeof obj {
  let result: { [k: string]: any } = {};

  for (let prop in obj) {
    if (!contains(obj, prop)) {
      continue;
    }

    if (typeof obj[prop] === 'object' && !Array.isArray(obj[prop])) {
      let flatInner = flattenObject(obj[prop]);

      for (let innerProp in flatInner) {
        if (!contains(flatInner, innerProp)) {
          continue;
        }
        result[prop + '.' + innerProp] = flatInner[innerProp];
      }
    } else {
      result[prop] = obj[prop];
    }
  }
  return result;
}
