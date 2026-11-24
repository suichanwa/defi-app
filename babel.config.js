module.exports = function (api) {
  api.cache(true);
  return {
    // nativewind/babel removed: nothing in src/ uses className, but the preset
    // swapped the JSX runtime so every element rendered through
    // react-native-css-interop, whose useAnimatedStyle is built against
    // reanimated 3. On reanimated 4 that crashes the UI runtime with
    // "Object is not a function". NativeWind v5 is the reanimated-4-compatible
    // line if className is ever wanted back.
    presets: ['babel-preset-expo'],
    plugins: [
      '@babel/plugin-proposal-export-namespace-from',
      [
        'module:react-native-dotenv',
        {
          moduleName: '@env',
          path: '.env',
          blocklist: ['JEST_WORKER_ID'],
          allowlist: null,
          safe: false,
          allowUndefined: true,
        },
      ],
      ['module-resolver', {
        root: ['./src'],
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
        alias: {
          '@app-types': './src/types',
          '@components': './src/ui/components',
          '@config': './src/config',
          '@constants': './src/constants',
          '@context': './src/context',
          '@hooks': './src/hooks',
          '@i18n': './src/i18n',
          '@screens': './src/screens',
          '@services': './src/services',
          '@styles': './src/ui/styles',
          '@theme': './src/theme',
          '@utils': './src/utils',
        },
      }],
      // No worklets plugin here: babel-preset-expo (SDK 54+) adds
      // react-native-worklets/plugin automatically. Listing it again transforms
      // worklets twice and they blow up at runtime as "Object is not a function".
    ],
  };
};
