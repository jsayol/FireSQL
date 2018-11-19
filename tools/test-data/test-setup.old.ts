import chalk from 'chalk';
import * as admin from 'firebase-admin';
import { wipeFirestore } from './wipe-firestore';
import { loadTestDataset, TestCollection } from './load-test-data';

main().then(() => process.exit());

async function main() {
  const project = loadJSONFile('../../config/project.json');
  const serviceAccount = loadJSONFile('../../config/serviceAccountKey.json');

  if (!project || !serviceAccount) {
    console.log('');
    return false;
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: project.databaseURL
  });

  const firestore = admin.firestore();
  firestore.settings({ timestampsInSnapshots: true });

  await wipeFirestore(firestore, project.projectId);
  await loadTestDataset(firestore, loadJSONFile('./data.json') as TestCollection[]);

  console.log('\nDone! you can now run "yarn test" to run the tests.\n');
}

function loadJSONFile(fileName: string): { [k: string]: any } | null {
  let data: { [k: string]: any } | null = null;

  try {
    data = require(fileName);
  } catch (err) {
    console.log(
      chalk.bgRed.bold('   ERROR   ') + ` Couldn't load file ${fileName}`
    );
  }

  return data;
}
