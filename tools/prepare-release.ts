const path = require('path');
const fs = require('fs-extra');
const pkg = require('../package.json');
const rimraf = require('rimraf');

function filePath(file: string): string {
  return path.resolve(__dirname, '..', file);
}

rimraf.sync('./release');

fs.copySync(filePath('README.md'), filePath('release/README.md'));
fs.copySync(filePath('LICENSE'), filePath('release/LICENSE'));
fs.copySync(filePath('out'), filePath('release'));
// fs.copySync(filePath('out/types'), filePath('release/types'));

// fs.copySync(
//   filePath('out/firesql.es5.js'),
//   filePath('release/firesql.es5.js')
// );

// fs.copySync(
//   filePath('out/firesql.es5.js.map'),
//   filePath('release/firesql.es5.js.map')
// );

fs.copySync(
  filePath('out/firesql.umd.js'),
  filePath('release/firesql.umd.js')
);

fs.copySync(
  filePath('out/firesql.umd.js.map'),
  filePath('release/firesql.umd.js.map')
);

fs.copySync(
  filePath('src/sql-parser/index.js'),
  filePath('release/sql-parser/index.js')
);

fs.copySync(
  filePath('src/sql-parser/index.d.ts'),
  filePath('release/types/sql-parser/index.d.ts')
);

const newPkg = {
  name: 'firesql',
  version: pkg.version,
  description: pkg.description,
  keywords: pkg.keywords,
  main: pkg.main.replace(/^out\//, ''),
  // module: pkg.module.replace(/^out\//, ''),
  typings: pkg.typings.replace(/^out\//, ''),
  author: pkg.author,
  repository: pkg.repository,
  license: pkg.license,
  engines: pkg.engines,
  scripts: pkg.scripts,
  dependencies: pkg.dependencies,
  peerDependencies: pkg.peerDependencies
};

fs.writeFileSync(
  filePath('release/package.json'),
  JSON.stringify(newPkg, null, 2)
);

console.log(`Prepared release: ${newPkg.version}`);
console.log('\n');
