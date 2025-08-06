const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add support for resolving modules without file extensions
config.resolver.sourceExts.push('js', 'json', 'ts', 'tsx', 'jsx');

// Ensure proper module resolution
config.resolver.platforms = ['native', 'android', 'ios', 'web'];

module.exports = config;
