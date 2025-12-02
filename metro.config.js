// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Workaround para erro "node:sea" no Windows
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  'node:sea': path.resolve(__dirname, 'empty-module.js'),
};

module.exports = config;