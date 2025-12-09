module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'expo-router/babel',
      [
        'module:react-native-dotenv',
        {
          envName: 'APP_ENV',
          moduleName: '@env',
          path: '.env.local',
          allowUndefined: false
        }
      ],
      [
        'module-resolver',
        {
          root: ['./'],
          extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
          alias: {
            '@': './',
            '~': './',
            '@app': './app',
            '@assets': './assets',
            '@components': './components',
            '@hooks': './hooks',
            '@services': './services',
            '@store': './store',
            '@utils': './utils'
          }
        }
      ]
    ]
  };
};
