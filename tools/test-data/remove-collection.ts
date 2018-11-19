import * as firebase from 'firebase';

export async function wipeCollection(
  ref: firebase.firestore.DocumentReference,
  colName: string,
  subCollections?: string | string[] | SubCollection[]
): Promise<any> {
  let subcols: SubCollection[];

  if (!subCollections) {
    subcols = [];
  } else if (typeof subCollections === 'string') {
    subcols = [{ name: subCollections, subcols: [] }];
  } else if (Array.isArray(subCollections)) {
    (subCollections as any[]).forEach(
      (subcol: string | SubCollection): SubCollection | void => {
        if (typeof subcol === 'string') {
          subcols.push({ name: subcol, subcols: [] } as SubCollection);
        }

        if (subcol && (subcol as SubCollection).name) {
          subcols.push(subcol as SubCollection);
        }
      }
    );
  }

  const querySnap = await ref.collection(colName).get();

  const operations = querySnap.docs.map(docSnap => {
    return Promise.all<any>([
      docSnap.ref.delete(),
      ...(subcols || []).map(subcol =>
        wipeCollection(docSnap.ref, subcol.name, subcol.subcols)
      )
    ]);
  });

  return Promise.all(operations);
}

interface SubCollection {
  name: string;
  subcols?: SubCollection[];
}
