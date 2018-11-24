// demo.js

if (!process.send) {
  parent();
} else {
  child();
}

function parent() {
  const { fork } = require('child_process');

  console.log('Starting emulator.');
  const proc = fork('demo.js', [], {
    stdio: ['inherit', 'pipe', 'pipe', 'ipc']
  });

  proc.stdout.on('data', async data => {
    const stdout = data.toString().trim();
    console.log('[SERVE-LOG]', stdout);

    if (/^API endpoint: /.test(stdout)) {
      console.log('Emulator is running.');

      /** Run tests with @firebase/testing using the emulator ... **/
      await runTests();

      /** ... and then kill it when we're done **/
      console.log('Done testing, closing the emulator.');
      proc.kill('SIGINT');
    }
  });

  proc.stderr.on('data', async data => {
    const stderr = data.toString().trim();
    console.log('[SERVE-ERR]', stderr);
  });

  proc.on('exit', message => {
    console.log('Emulator closed.');
  });
}

function child() {
  const firebaseTools = require('firebase-tools');
  const serving = firebaseTools.serve({
    only: 'firestore'
  });

  process.on('SIGINT', async () => {
    // Wait for serve to finish
    await serving;

    // And exit
    process.exit();
  });
}

async function runTests() {
  console.log('Testing 1, 2, 3.');
}
