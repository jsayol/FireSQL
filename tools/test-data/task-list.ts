import chalk from 'chalk';
const logUpdate = require('log-update');

const frames = ['\u2014', '\\', '|', '/'];

let task = '';
let interval: any = null;

export function showTask(str: string): { done: Function } {
  if (interval || task.length > 0) {
    done();
  }

  let i = 1;
  task = str;

  logUpdate(`${frames[0]} ${task} ...`);

  interval = setInterval(() => {
    const frame = frames[i++ % frames.length];
    logUpdate(chalk`{bold {grey ${frame}}} ${task} ...`);
  }, 80);

  return { done };
}

function done(result?: string) {
  clearInterval(interval);

  let log = chalk`{green {bold \u2713}} ${task}`;

  if (result !== void 0) {
    log += chalk` {grey ${result}}`;
  }

  logUpdate(log);
  logUpdate.done();
  interval = null;
  task = '';
}

function demo() {
  let lasTask: any;

  showTask('Downloading project configuration');
  setTimeout(
    () => showTask('Deploying Firestore security rules and indexes'),
    1500
  );
  setTimeout(() => showTask('Erasing "shop" collection'), 3000);
  setTimeout(
    () => (lasTask = showTask('Loading test data into "shop" collection')),
    4500
  );

  setTimeout(() => lasTask.done(), 6000);
}
