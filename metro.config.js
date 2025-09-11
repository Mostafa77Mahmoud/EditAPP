
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add support for TypeScript and other file extensions
config.resolver.sourceExts = [...config.resolver.sourceExts, 'cjs'];

// Enable web support
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

module.exports = config;
