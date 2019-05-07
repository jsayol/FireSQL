import chalk from 'chalk';
import { argv } from 'yargs';
import { homedir } from 'os';
import { writeFile as writeFileAsync } from 'fs';
import { promisify } from 'util';
import { resolve as resolvePath } from 'path';
import { showTask } from './task-list';
import { muteDeprecationWarning } from './mute-warning';
import { loadTestDataset, TestCollection } from './load-test-data';
import * as firebase from 'firebase';
import { loadJSONFile } from '../utils';

const firebaseTools = require('firebase-tools');
const inquirer = require('inquirer');

// Command-line arguments
const cliOptions = {
  token: (argv.token || argv.T) as string,
  project: (argv.project || argv.P) as string
};

let task: ReturnType<typeof showTask>;
const writeFile = promisify(writeFileAsync);
const fromRunTests = process.env['FIRESQL_TEST_SETUP_FROM_RUN'] === 'yes';

// We export this in case we want to "require()" from another script
// and wait until it's done.
export default getSetupType()
  .then(async setupType => {
    if (setupType === 'local') {
      return setupEmulator();
    } else if (setupType === 'remote') {
      return setupProject();
    } else {
      throw new Error('Unknown setup type selection.');
    }
  })
  .then((result: boolean) => {
    if (task) {
      task.done();
    }
    if (!fromRunTests) {
      if (result !== false) {
        console.log('\nDone!');
        console.log('You can now run "yarn test" to run the tests.\n');
      }
      process.exit();
    }
  })
  .catch(err => {
    if (fromRunTests) {
      throw err;
    } else {
      console.error(err);
      process.exit(1);
    }
  });

async function getSetupType(): Promise<string> {
  console.log('');

  const { setupType } = await inquirer.prompt([
    {
      type: 'list',
      name: 'setupType',
      message: 'What kind of test environment do you want?',
      choices: [
        {
          name: chalk`Using a local Firestore emulator {grey (requires Java)}`,
          value: 'local'
        },
        {
          name: chalk`Using the real Firestore backend`,
          value: 'remote'
        }
      ]
    }
  ]);

  return setupType;
}

async function writeTestConfig(config: object): Promise<any> {
  // Write config to top-level config directory
  await writeFile(
    resolvePath(__dirname, '../../config/test.config.json'),
    JSON.stringify(config, null, 2)
  );
}

async function setupEmulator(): Promise<boolean> {
  task = showTask('Setting up Firestore emulator');
  await writeTestConfig({ type: 'local' });
  await firebaseTools.setup.emulators.firestore();
  task.done();
  return true;
}

async function setupProject(): Promise<boolean> {
  console.log('');
  task = showTask('Getting authentication token');
  const token = await getToken();
  task.done();

  const project = await getProject(token);

  showWarning(project);

  const confirmation = await userConfirmation();
  if (!confirmation) {
    console.log('\nYou chose not to continue. Nothing was changed.\n');
    return false;
  }

  task = showTask('Downloading project configuration');
  const config = await firebaseTools.setup.web({ project, token });
  await writeTestConfig({ type: 'remote', project: config });
  task.done();

  // Deploy database rules
  task = showTask('Deploying Firestore indexes and security rules');
  await firebaseTools.deploy({
    project,
    token,
    cwd: resolvePath(__dirname, '../../config')
  });

  // Firestore calls grpc.load() which has been deprecated and we
  // get an ugly warning on screen. This mutes it temporarily.
  const unmute = muteDeprecationWarning();

  const firestore = firebase.initializeApp(config).firestore();
  const rootRef = firestore.doc('/');

  task = showTask('Deleting "shops" collection');
  await firebaseTools.firestore.delete('/shops', {
    project,
    yes: true,
    recursive: true
  });

  task = showTask('Loading test data into "shops" collection');
  await loadTestDataset(rootRef, loadJSONFile(
    resolvePath(__dirname, './data.json')
  ) as TestCollection[]);

  unmute();
  task.done();
  return true;
}

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

  task = showTask('Retrieving list of available projects');
  const projects = await firebaseTools.list({ token });
  task.done();
  console.log('');

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
