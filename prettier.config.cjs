const commonConfig = require('./common.config.cjs');

module.exports = {
  singleQuote: commonConfig.singleQuote,
  arrowParens: commonConfig.arrowParens,
  printWidth: commonConfig.printWidth,
  plugins: ['prettier-plugin-organize-imports'],
};
