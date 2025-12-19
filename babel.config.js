module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    plugins: [
      ['module:react-native-dotenv', {
        moduleName: '@env',
        path: '.env',
      }],
      ['module-resolver', {
        root: ['./src'],
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
        alias: {
          '@components': './src/components',
          '@screens': './src/screens',
          '@hooks': './src/hooks',
          '@services': './src/services',
          '@app-types': './src/types',
          '@styles': './src/styles',
          '@context': './src/context',
          '@theme': './src/theme',
          '@i18n': './src/i18n',
          '@utils': './src/utils',
          '@constants': './src/constants',
          '@config': './src/config',
        },
      }],
      'react-native-reanimated/plugin', // MUST be last
    ],
  };
};
