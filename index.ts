// Load all polyfills FIRST - before any other imports
import './polyfills';

import { LogBox } from 'react-native';
import './global.css';
import 'react-native-reanimated';
import { registerRootComponent } from 'expo';

(
  globalThis as typeof globalThis & {
    SHIMS_DISABLE_LOGS?: boolean;
  }
).SHIMS_DISABLE_LOGS = true;
require('@ethersproject/shims');

const cryptoObj = globalThis.crypto as {
  getRandomValues?: (array: ArrayBufferView) => ArrayBufferView | void;
};
if (cryptoObj?.getRandomValues) {
  const originalGetRandomValues = cryptoObj.getRandomValues.bind(cryptoObj);
  cryptoObj.getRandomValues = (array: ArrayBufferView) => originalGetRandomValues(array) ?? array;
}

LogBox.ignoreLogs(["SafeAreaView has been deprecated"]);
import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
