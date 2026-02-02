const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.extraNodeModules = {
  crypto: require.resolve('crypto-browserify'),
  stream: require.resolve('readable-stream'),
  buffer: require.resolve('buffer'),
  events: require.resolve('events'),
  util: require.resolve('util'),
  assert: require.resolve('assert'),
  string_decoder: require.resolve('string_decoder'),
  process: require.resolve('process/browser'),
};

// Allow importing from @noble/hashes subpaths
config.resolver.sourceExts = [...config.resolver.sourceExts, 'cjs'];

module.exports = config;