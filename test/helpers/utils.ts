import firebase from 'firebase/app';
import 'firebase/firestore';

export function initFirestore(): firebase.firestore.Firestore {
  let firestore: firebase.firestore.Firestore;

  try {
    firestore = firebase.app().firestore();
  } catch (err) {
    const project = require('../../config/project.json');
    const app = firebase.initializeApp(project);
    firestore = app.firestore();
    firestore.settings({ timestampsInSnapshots: true });
  }

  return firestore;
}
