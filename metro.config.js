const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const fs = require('fs');

const config = getDefaultConfig(__dirname);

// Get the root node_modules path
const projectRoot = __dirname;
const nobleHashesRoot = path.join(projectRoot, 'node_modules', '@noble', 'hashes');
const nobleCiphersRoot = path.join(projectRoot, 'node_modules', '@noble', 'ciphers');

config.resolver.extraNodeModules = {
  crypto: require.resolve('crypto-browserify'),
  stream: require.resolve('stream-browserify'),
  buffer: require.resolve('buffer'),
  events: require.resolve('events'),
  util: require.resolve('util'),
  assert: require.resolve('assert'),
  string_decoder: require.resolve('string_decoder'),
  process: require.resolve('process/browser'),
  'readable-stream': require.resolve('readable-stream'),
  // Force @noble packages to use root versions
  '@noble/hashes': nobleHashesRoot,
  '@noble/ciphers': nobleCiphersRoot,
};

// Metro package "exports" support is inconsistent for some nested deps (web3/webrtc).
// Fall back to classic file-based resolution to avoid false unresolved subpath errors.
config.resolver.unstable_enablePackageExports = false;

// Allow importing from @noble/hashes subpaths
config.resolver.sourceExts = [...config.resolver.sourceExts, 'cjs'];

// Ignore transient Gradle build output inside node_modules. These directories
// can be deleted/recreated while Metro is crawling, which causes ENOENT watch
// crashes on Windows fallback watcher.
const transientAndroidBuildDirs = [
  /[/\\]node_modules[/\\].*[/\\]android[/\\].*[/\\]build[/\\].*/,
];

if (!config.resolver.blockList) {
  config.resolver.blockList = transientAndroidBuildDirs;
} else if (Array.isArray(config.resolver.blockList)) {
  config.resolver.blockList = [
    ...config.resolver.blockList,
    ...transientAndroidBuildDirs,
  ];
} else {
  config.resolver.blockList = [
    config.resolver.blockList,
    ...transientAndroidBuildDirs,
  ];
}

// Custom resolver to handle @noble/hashes and @noble/ciphers subpath imports
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Handle @noble/hashes subpath imports - always use root version
  if (moduleName.startsWith('@noble/hashes/')) {
    const subpath = moduleName.replace('@noble/hashes/', '');
    
    // Try with the exact subpath first (in case it already has extension)
    let resolvedPath = path.join(nobleHashesRoot, subpath);
    if (fs.existsSync(resolvedPath)) {
      return { filePath: resolvedPath, type: 'sourceFile' };
    }
    
    // Try adding .js extension
    resolvedPath = path.join(nobleHashesRoot, `${subpath}.js`);
    if (fs.existsSync(resolvedPath)) {
      return { filePath: resolvedPath, type: 'sourceFile' };
    }
    
    // Try esm directory
    resolvedPath = path.join(nobleHashesRoot, 'esm', `${subpath}.js`);
    if (fs.existsSync(resolvedPath)) {
      return { filePath: resolvedPath, type: 'sourceFile' };
    }
  }
  
  // Handle @noble/hashes base import
  if (moduleName === '@noble/hashes') {
    return {
      filePath: path.join(nobleHashesRoot, 'index.js'),
      type: 'sourceFile',
    };
  }
  
  // Handle @noble/ciphers subpath imports - always use root version
  if (moduleName.startsWith('@noble/ciphers/')) {
    const subpath = moduleName.replace('@noble/ciphers/', '');
    
    // Try with the exact subpath first
    let resolvedPath = path.join(nobleCiphersRoot, subpath);
    if (fs.existsSync(resolvedPath)) {
      return { filePath: resolvedPath, type: 'sourceFile' };
    }
    
    // Try adding .js extension
    resolvedPath = path.join(nobleCiphersRoot, `${subpath}.js`);
    if (fs.existsSync(resolvedPath)) {
      return { filePath: resolvedPath, type: 'sourceFile' };
    }
    
    // Try esm directory
    resolvedPath = path.join(nobleCiphersRoot, 'esm', `${subpath}.js`);
    if (fs.existsSync(resolvedPath)) {
      return { filePath: resolvedPath, type: 'sourceFile' };
    }
  }
  
  // Handle @noble/ciphers base import
  if (moduleName === '@noble/ciphers') {
    return {
      filePath: path.join(nobleCiphersRoot, 'index.js'),
      type: 'sourceFile',
    };
  }

  // Handle expo-modules-core directly to avoid Metro appending extension to "src/index.ts"
  if (moduleName === 'expo-modules-core') {
    const expoModulesCoreIndex = path.join(projectRoot, 'node_modules', 'expo-modules-core', 'src', 'index.ts');
    if (fs.existsSync(expoModulesCoreIndex)) {
      return {
        filePath: expoModulesCoreIndex,
        type: 'sourceFile',
      };
    }
  }
  
  // Fall back to default resolver
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
