import { resolve as resolvePath } from 'path';
import * as jest from 'jest-cli';

const testConfigFile = resolvePath(__dirname, '../config/test.config.json');

const readConfig = new Promise(resolve => {
  let config;

  try {
    config = require(testConfigFile);
    resolve(config);
  } catch (err) {
    // Config file doesn't exist yet, lets run the test setup script
    process.env['FIRESQL_TEST_SETUP_FROM_RUN'] = 'yes';
    require('./tests/test-setup.ts')
      .default.then(() => {
        try {
          config = require(testConfigFile);
          resolve(config);
        } catch (err2) {
          // Ok, they really don't want to setup the test environment 🤷
          resolve();
        }
      })
      .catch(() => {
        // Nothing to do, I guess
      });
  }
});

readConfig
  .then(async (config?: any) => {
    if (config) {
      if (config.type === 'local') {
        require('./tests/emulator');
      } else {
        await jest.run([
          '--verbose',
          '--config',
          resolvePath(__dirname, '../jest.config.js'),
          '--rootDir',
          resolvePath(__dirname, '../')
        ]);
      }
    }
  })
  .catch(() => { /* The promise never rejects */ });
