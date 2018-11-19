import chalk from 'chalk';
import { argv } from 'yargs';
import { homedir } from 'os';
import { writeFile } from 'fs';
import { promisify } from 'util';
import { resolve as resolvePath } from 'path';
import { showTask } from './show-task';

const firebaseTools = require('firebase-tools');
const inquirer = require('inquirer');

// Command-line arguments
const cliOptions = {
  token: argv.token || argv.T,
  project: argv.project || argv.P
};

async function getToken(): Promise<string> {
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

getToken()
  .then(async (token: string) => {
    const project = await getProject(token);

    showWarning(project);

    const configPromise = firebaseTools.setup.web({ project, token });
    const confirmation = await userConfirmation();

    if (!confirmation) {
      console.log('\nYou chose not to continue. Nothing was changed.\n');
      return;
    }

    console.log('');

    let task = showTask('Downloading project configuration');
    const config = await configPromise;

    // Write config to top-level config directory
    await promisify(writeFile)(
      resolvePath(__dirname, '../../config/project.json'),
      JSON.stringify(config, null, 2)
    );

    // Deploy database rules
    task = showTask('Deploying Firestore indexes and security rules');
    await firebaseTools.deploy({
      project,
      token,
      cwd: resolvePath(__dirname, '../../config')
    });

    // TODO:
    // task = showTask('Erasing "shop" collection');

    // TODO:
    // task = showTask('Loading test data into "shop" collection');

    task.done();

    console.log('');
    return;
  })
  .then(() => {
    process.exit();
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });

function showWarning(projectId: string) {
  console.log('');
  console.log(
    chalk`{bold {bgRed   WARNING  } {red Read this very carefully!}}\n`
  );
  console.log(
    chalk`{bold You are about to do the following to Firestore for this project:}`
  );
  console.log('  \u2022 Overwrite the security rules');
  console.log('  \u2022 Overwrite the indexes');
  console.log('  \u2022 Erase the "shops" collection');
  console.log('  \u2022 Load test data into the "shops" collection');
  console.log('');
  console.log(chalk`{bold {blue    Project:}} ${projectId}\n`);
}

async function userConfirmation(): Promise<boolean> {
  const { confirmation } = await inquirer.prompt([
    {
      type: 'input',
      name: 'confirmation',
      message: 'Are you sure you want to continue? Type "yes":'
    }
  ]);

  return confirmation.toLowerCase() === 'yes';
}
