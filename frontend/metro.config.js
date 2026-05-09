const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const projectRoot = path.resolve(__dirname);
const config = getDefaultConfig(projectRoot);

module.exports = withNativeWind(config, { 
  input: path.join(projectRoot, 'global.css')
});