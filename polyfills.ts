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

export {};
