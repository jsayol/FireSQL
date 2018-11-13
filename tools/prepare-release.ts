const path = require('path');
const fs = require('fs-extra');
const pkg = require('../package.json');

function filePath(file: string): string {
  return path.resolve(__dirname, '..', file);
}

fs.copySync(filePath('README.md'), filePath('release/README.md'));
fs.copySync(filePath('LICENSE'), filePath('release/LICENSE'));
fs.copySync(filePath('dist/lib'), filePath('release'));
fs.copySync(filePath('dist/types'), filePath('release/types'));

fs.copySync(
  filePath('dist/firesql.es5.js'),
  filePath('release/firesql.es5.js')
);
fs.copySync(
  filePath('dist/firesql.es5.js.map'),
  filePath('release/firesql.es5.js.map')
);
fs.copySync(
  filePath('dist/firesql.umd.js'),
  filePath('release/firesql.umd.js')
);
fs.copySync(
  filePath('dist/firesql.umd.js.map'),
  filePath('release/firesql.umd.js.map')
);

const newPkg = {
  name: pkg.name,
  version: pkg.version,
  description: pkg.description,
  keywords: pkg.keywords,
  main: pkg.main.replace(/^dist\//, ''),
  module: pkg.module.replace(/^dist\//, ''),
  typings: pkg.typings.replace(/^dist\//, ''),
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
