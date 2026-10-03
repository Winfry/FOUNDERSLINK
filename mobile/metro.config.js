const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

const sharedRoot = path.resolve(workspaceRoot, 'shared');

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.startsWith('@shared/')) {
    const subpath = moduleName.slice('@shared/'.length);
    return context.resolveRequest(
      context,
      path.join(sharedRoot, subpath),
      platform,
    );
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
