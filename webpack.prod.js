'use strict';

const webpack = require('webpack');
const merge = require('webpack-merge');

const commonConfig = require('./webpack.common');

module.exports = merge(
    commonConfig,
    {
        mode: 'production',
        plugins: [
            new webpack.EnvironmentPlugin(['NODE_ENV'])
        ]
    }
);
