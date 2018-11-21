/*! Copyright 2019 Ayogo Health Inc. */

import typescript from 'rollup-plugin-typescript2';
import cleanup from 'rollup-plugin-cleanup';
import sourcemaps from 'rollup-plugin-sourcemaps';

let outputPath = process.env.OUTPUT_PATH || '';
if (outputPath && !outputPath.endsWith('/')) {
  outputPath += '/';
}

function rollupConfig(file) {
  return {
    input: `src/${file}.ts`,
    output: {
      file: `${outputPath}${file}.js`,
      format: 'iife',
      banner: '/*! Copyright 2019 Ayogo Health Inc. */',
      sourcemap: true
    },
    plugins: [
      typescript(),
      cleanup({ extensions: ['js', 'ts'], sourcemap: true }),
      sourcemaps()
    ]
  }
}

export default (['index', 'polyfill', 'component'].map(rollupConfig));
