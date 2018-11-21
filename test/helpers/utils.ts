import * as firebaseTest from '@firebase/testing';
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
      ssl: false,
      timestampsInSnapshots: true
    });
  } else {
    try {
      firestore = firebase.app().firestore();
    } catch (err) {
      const project = require('../../config/project.json');
      const app = firebase.initializeApp(project);
      firestore = app.firestore();
      firestore.settings({ timestampsInSnapshots: true });
    }
  }

  return firestore;
}
