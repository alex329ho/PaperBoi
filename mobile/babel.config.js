module.exports = function (api) {
  api.cache(true);
  const plugins = [];

  try {
    require.resolve('react-native-reanimated/plugin');
    plugins.push('react-native-reanimated/plugin');
  } catch {
    // Allow tests to run even if the reanimated plugin is unavailable in the environment.
  }

  return {
    presets: ['babel-preset-expo'],
    plugins,
  };
};
