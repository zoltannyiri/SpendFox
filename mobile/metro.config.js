const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const { withNativeWind } = require('nativewind/metro');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  resolver: {
    blockList: [
      /android[/\\]app[/\\]\.cxx[/\\].*/,
      /android[/\\]app[/\\]build[/\\].*/,
      /android[/\\]build[/\\].*/,
      /ios[/\\]build[/\\].*/,
      /ios[/\\]Pods[/\\].*/,
    ],
  },
};

module.exports = withNativeWind(mergeConfig(getDefaultConfig(__dirname), config), {
  input: './global.css',
  forceWriteFileSystem: true,
});
