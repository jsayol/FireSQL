const firebaseTools = require('firebase-tools');

let serving = firebaseTools.serve({
  only: 'firestore'
});

process.on('SIGINT', () => cleanExit('SIGINT'));
process.on('SIGTERM', () => cleanExit('SIGTERM'));

const cleanExit = async function(signal) {
  await serving;
  process.exit();
};
