'use strict';

function escapeChars(str) {

  return str.replace(/\\/g, '\\\\').replace(/:/g, '\\c').replace(/\r/g, '\\r').replace(/\n/g, '\\n');
}

function unescapeChars(str) {

  return str.replace(/\\c/g, ':').replace(/\\r/g, '\r').replace(/\\n/g, '\n');
}

module.exports.escape = escapeChars;
module.exports.unescape = unescapeChars;