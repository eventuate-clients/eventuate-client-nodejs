'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
var escapeStr = exports.escapeStr = function escapeStr(str) {

  return str.replace(/\\/g, '\\\\').replace(/:/g, '\\c').replace(/\r/g, '\\r').replace(/\n/g, '\\n');
};

var unEscapeStr = exports.unEscapeStr = function unEscapeStr(str) {

  return str.replace(/\\c/g, ':').replace(/\\r/g, '\r').replace(/\\n/g, '\n');
};