'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var parseIsTrue = exports.parseIsTrue = function parseIsTrue(val) {
  return (/^(?:t(?:rue)?|yes?|1+)$/i.test(val)
  );
};

var toJSON = exports.toJSON = function toJSON(v, callback) {

  if ((typeof v === 'undefined' ? 'undefined' : _typeof(v)) == 'object') {
    return callback(null, v);
  }

  try {
    callback(null, JSON.parse(v));
  } catch (err) {
    callback(err);
  }
};