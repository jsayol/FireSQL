import chalk from 'chalk';
import { argv } from 'yargs';
import { homedir } from 'os';
import { writeFile } from 'fs';
import { promisify } from 'util';
import { resolve as resolvePath } from 'path';
import { showTask } from './task-list';
import { muteDeprecationWarning } from './mute-warning';
import { loadTestDataset, TestCollection } from './load-test-data';
import * as firebase from 'firebase';

const firebaseTools = require('firebase-tools');
const inquirer = require('inquirer');

// Command-line arguments
const cliOptions = {
  token: argv.token || argv.T,
  project: argv.project || argv.P
};

// getToken()
//   .then(async (token: string) => {
//     const project = await getProject(token);

//     showWarning(project);

//     const confirmation = await userConfirmation();
//     if (!confirmation) {
//       console.log('\nYou chose not to continue. Nothing was changed.\n');
//       return false;
//     }

//     console.log('');

//     let task = showTask('Downloading project configuration');
//     const config = await firebaseTools.setup.web({ project, token });
//     task.done('config/project.json');

//     // Write config to top-level config directory
//     await promisify(writeFile)(
//       resolvePath(__dirname, '../../config/project.json'),
//       JSON.stringify(config, null, 2)
//     );

//     // Deploy database rules
//     task = showTask('Deploying Firestore indexes and security rules');
//     await firebaseTools.deploy({
//       project,
//       token,
//       cwd: resolvePath(__dirname, '../../config')
//     });

//     // Firestore calls grpc.load() which has been deprecated and we
//     // get an ugly warning on screen. This mutes it temporarily.
//     const unmute = muteDeprecationWarning();

//     const firestore = firebase.initializeApp(config).firestore();
//     firestore.settings({ timestampsInSnapshots: true });
//     const rootRef = firestore.doc('/');

//     task = showTask('Deleting "shops" collection');
//     await firebaseTools.firestore.delete('/shops', {
//       project,
//       yes: true,
//       recursive: true
//     });

//     task = showTask('Loading test data into "shops" collection');
//     await loadTestDataset(rootRef, loadJSONFile(
//       './data.json'
//     ) as TestCollection[]);

//     unmute();
//     task.done();
//     return;
//   })
//   .then((result?: boolean) => {
//     if (result !== false) {
//       console.log('\nDone!');
//       console.log('You can now run "yarn test" to run the tests.\n');
//     }
//     process.exit();
//   })
//   .catch(err => {
//     console.error(err);
//     process.exit(1);
//   });

export async function getToken(): Promise<string> {
  if (cliOptions.token) {
    return cliOptions.token;
  }

  let cachedToken;

  try {
    const config = require(resolvePath(
      homedir(),
      '.config/configstore/firebase-tools.json'
    ));
    cachedToken = config.tokens.refresh_token;
  } catch (err) {
    /* no problem */
  }

  if (cachedToken) {
    return cachedToken;
  }

  const {
    tokens: { refresh_token: freshToken }
  } = await firebaseTools.login.ci();

  return freshToken;
}

async function getProject(token: string): Promise<string> {
  if (cliOptions.project) {
    return cliOptions.project;
  }

  const projects = await firebaseTools.list({ token });
  const { project } = await inquirer.prompt([
    {
      type: 'list',
      name: 'project',
      message: 'Which project would you like to use to test?',
      choices: projects.map((project: { [k: string]: string }) => ({
        name: chalk`${project.name} {grey (${project.id})}`,
        value: project
      }))
    }
  ]);

  return project.id;
}

function showWarning(projectId: string) {
  console.log('');
  console.log(
    chalk`{bold {bgRed   WARNING  } {red Read this very carefully!}}\n`
  );
  console.log(
    chalk`{bold You are about to do the following to this project's Firestore:}`
  );
  console.log('  \u2022 Overwrite the security rules');
  console.log('  \u2022 Overwrite the indexes');
  console.log('  \u2022 Delete the "shops" collection');
  console.log('  \u2022 Load test data into the "shops" collection');
  console.log('');
  console.log(chalk`{bold {blue    Project:}} ${projectId}\n`);
}

async function userConfirmation(): Promise<boolean> {
  const { confirmation } = await inquirer.prompt([
    {
      default: false,
      type: 'confirm',
      name: 'confirmation',
      message: 'Are you sure you want to continue?'
    }
  ]);

  return confirmation;
}

export function loadJSONFile(fileName: string): { [k: string]: any } | null {
  let data: { [k: string]: any } | null = null;

  try {
    data = require(fileName);
  } catch (err) {
    // console.log(
    //   chalk.bgRed.bold('   ERROR   ') + ` Couldn't load file ${fileName}`
    // );
    console.log(`{bold {bgRed    ERROR   } Couldn't load file ${fileName}}`);
  }

  return data;
}
