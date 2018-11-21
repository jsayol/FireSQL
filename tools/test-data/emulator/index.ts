import { fork, ChildProcess } from 'child_process';
import * as firebaseTest from '@firebase/testing';
import { loadJSONFile } from '../test-setup';
import { showTask } from '../task-list';
import { muteDeprecationWarning } from '../mute-warning';
import firebase from 'firebase/app';
import 'firebase/firestore';
import { loadTestDataset, TestCollection } from '../load-test-data';
import { resolve as resolvePath } from 'path';
import * as jest from 'jest-cli';
import chalk from 'chalk';

const FIRESQL_TEST_PROJECT_ID = 'firesql-tests-with-emulator';

const firebaseTools = require('firebase-tools');
const unmute = muteDeprecationWarning();
let task: ReturnType<typeof showTask>;
let childProc: ChildProcess;

Promise.resolve().then(async () => {
  try {
    // task = showTask('Setting up Firestore emulator');
    // await firebaseTools.setup.emulators.firestore();

    task = showTask('Starting Firestore emulator');
    childProc = fork(resolvePath(__dirname, './serve.js'), [], {
      stdio: ['inherit', 'pipe', 'pipe', 'ipc']
    });

    childProc.stdout.on('data', onChildProcStdout);
    childProc.stderr.on('data', async data => {
      task.done();
      const stderr = data.toString();
      console.log('[EMULATOR][Error]', stderr);
    });

    childProc.on('exit', message => {
      task.done();
      process.exit();
    });
  } catch (err) {
    console.error(err);

    if (childProc) {
      childProc.kill('SIGINT');
    }
  }
});

async function onChildProcStdout(data: ReadableStream) {
  let emulatorRunning = false;

  try {
    const stdout = data.toString().trim();

    if (/^API endpoint: /.test(stdout)) {
      const devServerHost = stdout.match(/^API endpoint: http:\/\/(.+)/)![1];

      initFirestoreTest(devServerHost);

      task.done();
      emulatorRunning = true;
      await runTests(devServerHost);

      task = showTask('Closing the emulator.');
      childProc.kill('SIGINT');
    } else if (emulatorRunning) {
      task.done();
      // console.log('[EMULATOR]', stdout);
    }

    // console.log('[EMULATOR]', stdout);
  } catch (err) {
    console.error(err);

    if (childProc) {
      childProc.kill('SIGINT');
    }
  }
}

async function runTests(devServerHost: string) {
  try {
    const testApp = firebaseTest.initializeTestApp({
      projectId: FIRESQL_TEST_PROJECT_ID
    });
    const firestore = testApp.firestore();

    task = showTask('Loading test data');
    await loadTestDataset(firestore.doc('/'), loadJSONFile(
      resolvePath(__dirname, '../data.json')
    ) as TestCollection[]);
    task.done();

    process.env['FIRESQL_TEST_PROJECT_ID'] = FIRESQL_TEST_PROJECT_ID;
    process.env['FIRESQL_TEST_EMULATOR_HOST'] = devServerHost;

    console.log(chalk`{bold {grey \u231B}} Running tests ...\n`);
    await jest.run([
      '--verbose',
      '--config',
      resolvePath(__dirname, '../../../jest.config.js'),
      '--rootDir',
      resolvePath(__dirname, '../../../')
    ]);
  } catch (err) {
    console.error(err);

    if (childProc) {
      childProc.kill('SIGINT');
    }
  }
}

function initFirestoreTest(devServerHost: string) {
  const app = firebase.initializeApp({
    projectId: FIRESQL_TEST_PROJECT_ID
  });

  const firestore = app.firestore();
  firestore.settings({
    host: devServerHost,
    ssl: false,
    timestampsInSnapshots: true
  });
}
