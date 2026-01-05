const { withNativeWind } = require('nativewind/metro');
const {
  getSentryExpoConfig
} = require("@sentry/react-native/metro");

const config = getSentryExpoConfig(__dirname);

// Avoid Metro export-map warnings from deep imports in some deps (e.g. noble/hashes).
config.resolver.unstable_enablePackageExports = false;

module.exports = withNativeWind(config, { input: './global.css' });