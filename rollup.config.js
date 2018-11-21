/*! Copyright 2018 Ayogo Health Inc. */

import cleanup from 'rollup-plugin-cleanup';
import sourcemaps from 'rollup-plugin-sourcemaps';

export default {
    output: {
        format: 'umd',
        banner: '/*! Copyright 2018 Ayogo Health Inc. */',
        sourceMap: true,
        globals: {
            'angular': 'angular'
        }
    },
    plugins: [
        cleanup(),
        sourcemaps()
    ]
};
