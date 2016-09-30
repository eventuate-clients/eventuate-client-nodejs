'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getLogger = undefined;

var _log4js = require('log4js');

var _log4js2 = _interopRequireDefault(_log4js);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var getLogger = exports.getLogger = function getLogger() {
  var _ref = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

  var logLevel = _ref.logLevel;
  var title = _ref.title;


  var logger = _log4js2.default.getLogger(title || 'Logger');

  if (!logLevel) {
    logLevel = process.env.NODE_ENV !== 'production' ? 'DEBUG' : 'ERROR';
  }

  logger.setLevel(logLevel);

  return logger;
};