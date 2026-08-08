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
          blocklist: null,
          allowlist: null,
          safe: false,
          allowUndefined: true,
        },
      ],
      ['module-resolver', {
        root: ['./src'],
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
        alias: {
          '@components': './src/ui/components',
          '@screens': './src/screens',
          '@hooks': './src/hooks',
          '@services': './src/services',
          '@app-types': './src/types',
          '@styles': './src/ui/styles',
          '@context': './src/context',
          '@theme': './src/theme',
          '@i18n': './src/i18n',
          '@utils': './src/utils',
          '@constants': './src/constants',
          '@config': './src/config',
        },
      }],
      // No worklets plugin here: babel-preset-expo (SDK 54+) adds
      // react-native-worklets/plugin automatically. Listing it again transforms
      // worklets twice and they blow up at runtime as "Object is not a function".
    ],
  };
};
