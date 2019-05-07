import firebase from 'firebase/app';
import 'firebase/firestore';

let firestore: firebase.firestore.Firestore;

export function initFirestore(): firebase.firestore.Firestore {
  if (firestore) {
    return firestore;
  }

  const emulatorProjectId = process.env['FIRESQL_TEST_PROJECT_ID'];

  if (typeof emulatorProjectId === 'string') {
    // Using the local emulator
    const emulatorHost = process.env['FIRESQL_TEST_EMULATOR_HOST'];
    const app = firebase.initializeApp({
      projectId: emulatorProjectId
    });

    firestore = app.firestore();
    firestore.settings({
      host: emulatorHost,
      ssl: false
    });
  } else {
    try {
      firestore = firebase.app().firestore();
    } catch (err) {
      const { project } = require('../../config/test.config.json');
      const app = firebase.initializeApp(project);
      firestore = app.firestore();
    }
  }

  return firestore;
}


/*
import admin from 'firebase-admin';
import firebase from 'firebase/app';
import 'firebase/firestore';

let firestore: firebase.firestore.Firestore;
// let adminFirestore: admin.firestore.Firestore;

export function initFirestore(): firebase.firestore.Firestore {
  if (firestore) {
    return firestore;
  }

  firestore = _initFirestore(firebase);

  return firestore;
}

// export function initAdminFirestore(): admin.firestore.Firestore {
//   if (adminFirestore) {
//     return adminFirestore;
//   }

//   adminFirestore = _initFirestore(admin);

//   return adminFirestore;
// }

function _initFirestore<
  T extends firebase.firestore.Firestore | admin.firestore.Firestore
>(namespace: typeof firebase | typeof admin): T {
  const emulatorProjectId = process.env['FIRESQL_TEST_PROJECT_ID'];
  let firestoreObject: firebase.firestore.Firestore;

  if (typeof emulatorProjectId === 'string') {
    // Using the local emulator
    const emulatorHost = process.env['FIRESQL_TEST_EMULATOR_HOST'];
    const app = (namespace as typeof firebase).initializeApp({
      projectId: emulatorProjectId
    });

    firestoreObject = app.firestore();
    firestoreObject.settings({
      host: emulatorHost,
      ssl: false
    });
  } else {
    try {
      firestoreObject = (namespace as typeof firebase).firestore();
    } catch (err) {
      const { project } = require('../../config/test.config.json');
      const app = (namespace as typeof firebase).initializeApp(project);
      firestoreObject = app.firestore();
    }
  }

  return firestoreObject as T;
}
*/