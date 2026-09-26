/**
 * Polyfills for Node.js modules in React Native
 * MUST be loaded before any other imports
 */

// Random values for crypto operations
import 'react-native-get-random-values';

// Buffer polyfill - critical for crypto and streams
import { Buffer } from 'buffer';
if (typeof global.Buffer === 'undefined') {
  global.Buffer = Buffer;
}

// Make Buffer constructor available globally
if (typeof (global as any).BufferImpl === 'undefined') {
  (global as any).BufferImpl = Buffer;
}

import process from 'process';
if (typeof global.process === 'undefined') {
  global.process = process;
}
if (!global.process.env) {
  (global.process.env as any) = {};
}
(global.process.env as any).NODE_ENV =
  (global.process.env as any).NODE_ENV ??
  (__DEV__ ? 'development' : 'production');
(global.process as any).version = 'v16.0.0'; // Fake Node version for compatibility
(global.process as any).browser = true;

if (typeof global.setImmediate === 'undefined') {
  (global as any).setImmediate = (fn: (...args: unknown[]) => void, ...args: unknown[]) => {
    return setTimeout(fn, 0, ...args) as unknown as NodeJS.Immediate;
  };
}

if (typeof global.clearImmediate === 'undefined') {
  (global as any).clearImmediate = (id: NodeJS.Immediate) => {
    clearTimeout(id as unknown as NodeJS.Timeout);
  };
}

// Ensure global.global exists (required by some Node.js modules)
if (typeof (global as any).global === 'undefined') {
  (global as any).global = global;
}

// TextEncoder/TextDecoder polyfills for some crypto operations
if (typeof global.TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('util');
  (global as any).TextEncoder = TextEncoder;
  (global as any).TextDecoder = TextDecoder;
}

// Polyfill StatusBar stack methods for React Native Web
try {
  const { StatusBar } = require('react-native');
  const sb = StatusBar as any;
  const stub = () => ({});
  if (sb) {
    if (typeof sb.pushStackEntry !== 'function') sb.pushStackEntry = stub;
    if (typeof sb.popStackEntry !== 'function') sb.popStackEntry = () => {};
    if (typeof sb.replaceStackEntry !== 'function') sb.replaceStackEntry = stub;
    if (sb.default) {
      if (typeof sb.default.pushStackEntry !== 'function') sb.default.pushStackEntry = stub;
      if (typeof sb.default.popStackEntry !== 'function') sb.default.popStackEntry = () => {};
      if (typeof sb.default.replaceStackEntry !== 'function') sb.default.replaceStackEntry = stub;
    }
  }
} catch {
  // Ignore if react-native is not yet initialized
}

export {};
