import * as firebase from 'firebase';

export async function loadTestDataset(
  ref: firebase.firestore.DocumentReference,
  data: TestCollection[]
): Promise<any> {
  if (!Array.isArray(data)) {
    throw new Error('Test data needs to be an array of collections.');
  }

  for (let collection of data) {
    await loadCollection(ref, collection);
  }
}

function loadCollection(
  docRef: firebase.firestore.DocumentReference,
  col: TestCollection
): Promise<any> {
  const colRef = docRef.collection(col.collection);
  return Promise.all(col.docs.map(doc => loadDocument(colRef, doc)));
}

function loadDocument(
  colRef: firebase.firestore.CollectionReference,
  doc: TestDocument
): Promise<any> {
  const docRef = colRef.doc(doc.key);

  return Promise.all([
    docRef.set(doc.data),
    ...(doc.collections || []).map(col => loadCollection(docRef, col))
  ]);
}

export interface TestCollection {
  collection: string;
  docs: TestDocument[];
}

export interface TestDocument {
  key: string;
  data: { [k: string]: any };
  collections: TestCollection[];
}
