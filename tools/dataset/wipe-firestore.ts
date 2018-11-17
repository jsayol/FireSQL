import admin = require('firebase-admin');
import chalk from 'chalk';
const Input = require('prompt-input');

export async function wipeFirestore(
  firestore: admin.firestore.Firestore,
  projectId: string
): Promise<boolean> {
  showWarning(projectId);

  const proceed = await userConfirmation();

  if (!proceed) {
    console.log('Ok, nothing was done.\n');
    return false;
  }

  console.log('\nErasing current data ...');

  await wipeSubcollections(firestore);

  return true;
}

function showWarning(projectId: string) {
  console.log(
    '\n' +
      chalk.bgRedBright.bold('  WARNING  ') +
      ` This will erase all Firestore data for this project!` +
      '\n' +
      '\n' +
      chalk.bold(chalk.blue('   Project: ') + projectId) +
      '\n'
  );
}

async function userConfirmation(): Promise<boolean> {
  const input = new Input({
    message: 'Are you sure you want to continue? Type "yes":'
  });

  const answer = await input.run();
  return answer === 'yes';
}

async function wipeSubcollections(
  ref: admin.firestore.Firestore | admin.firestore.DocumentReference
): Promise<any> {
  const collections = await ref.listCollections();
  return Promise.all(collections.map(collection => wipeCollection(collection)));
}

async function wipeCollection(
  collection: admin.firestore.CollectionReference
): Promise<any> {
  const documents = await collection.listDocuments();
  return Promise.all(documents.map(document => wipeDocument(document)));
}

function wipeDocument(
  document: admin.firestore.DocumentReference
): Promise<any> {
  return Promise.all([document.delete(), wipeSubcollections(document)]);
}
