import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import sourceMaps from 'rollup-plugin-sourcemaps';
import camelCase from 'lodash.camelcase';
import typescript from 'rollup-plugin-typescript2';
import { uglify } from 'rollup-plugin-uglify';

const pkg = require('./package.json');

const libraryName = 'firesql';

const createConfig = ({ umd = false, input, output, external } = {}) => ({
  input,
  output,
  external: [
    ...Object.keys(umd ? {} : pkg.dependencies || {}),
    ...Object.keys(pkg.peerDependencies || {}),
    'firebase/app',
    'firebase/firestore',
    'rxjs/operators',
    'rxfire/firestore',
    ...(external || [])
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

    // Uglify UMD bundle for smaller size
    umd &&
      uglify({
        mangle: {
          properties: {
            keep_quoted: true,
            regex: /_$|^_/
          }
        },
        compress: {
          passes: 3
        }
      }),

    // Resolve source maps to the original source
    sourceMaps()
  ]
});

export default [
  // createConfig({
  //   input: 'src/index.ts',
  //   output: { file: pkg.module, format: 'es', sourcemap: true }
  // }),
  createConfig({
    input: 'src/index.umd.ts',
    umd: true,
    output: {
      file: 'out/firesql.umd.js',
      format: 'umd',
      name: camelCase(libraryName),
      globals: {
        'firebase/app': 'firebase',
        'firebase/firestore': 'firebase',
        'rxjs': '*',
        'rxjs/operators': '*',
        'rxfire/firestore': '*',
      },
      sourcemap: true,
      footer:
        'var FireSQL = (typeof firesql !== "undefined") && firesql.FireSQL;'
    }
  })
];
