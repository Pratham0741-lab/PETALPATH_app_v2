const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Prevent ENOENT file watcher errors on temporary build directories in node_modules
config.resolver.blockList = [
  /node_modules\/.*\/build\/classes\/.*/,
  /android\/build\/.*/,
  /\.expo\/.*/,
];

module.exports = config;
