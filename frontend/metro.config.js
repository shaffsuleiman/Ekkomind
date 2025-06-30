// metro.config.js

const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add support for CommonJS modules (`.cjs`)
config.resolver.sourceExts.push('cjs');

// Disable unstable package exports resolution (may prevent some Firebase bugs)
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
