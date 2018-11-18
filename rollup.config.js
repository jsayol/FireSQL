import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import sourceMaps from 'rollup-plugin-sourcemaps';
import camelCase from 'lodash.camelcase';
import typescript from 'rollup-plugin-typescript2';
// import json from 'rollup-plugin-json';
import babel from 'rollup-plugin-babel';
import { uglify } from 'rollup-plugin-uglify';

const pkg = require('./package.json');

const libraryName = 'firesql';

const createConfig = ({ umd = false, output } = {}) => ({
  input: 'src/index.ts',
  output,
  external: [
    ...Object.keys(umd ? {} : pkg.dependencies || {}),
    ...Object.keys(pkg.peerDependencies || {}),
    'firebase/app',
    'firebase/firestore',
    'rxjs/operators',
    'rxfire/firestore'
  ],
  watch: {
    include: 'src/**'
  },
  plugins: [
    // Compile TypeScript files
    typescript({ useTsconfigDeclarationDir: true }),

    // Allow node_modules resolution, so you can use 'external' to control
    // which external modules to include in the bundle
    // https://github.com/rollup/rollup-plugin-node-resolve#usage
    resolve(),

    // Allow bundling cjs modules (unlike webpack, rollup doesn't understand cjs)
    commonjs({ extensions: ['.js', '.jsx'] }),

    // The node-sqlparser module includes code with some ES6 features
    // so we need to transpile it with Babel for the UMD bundle
    umd &&
      babel({
        test: /\.js$/,
        include: 'node_modules/node-sqlparser/lib/**',
        presets: [
          [
            '@babel/preset-env',
            {
              targets: {
                browsers: 'ie >= 8'
              }
            }
          ]
        ]
      }),

    // Uglify UMD bundle for smaller size
    umd && uglify(),

    // Resolve source maps to the original source
    sourceMaps()
  ]
});

export default [
  createConfig({
    output: { file: pkg.module, format: 'es', sourcemap: true }
  }),
  createConfig({
    umd: true,
    output: {
      file: pkg.main,
      format: 'umd',
      name: camelCase(libraryName),
      sourcemap: true,
      footer: 'var FireSQL = (typeof firesql !== "undefined") && firesql.FireSQL;'
    }
  })
];
