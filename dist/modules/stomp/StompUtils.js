"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var StompLogging = exports.StompLogging = function () {
  function StompLogging(should_debug) {
    _classCallCheck(this, StompLogging);

    this.should_debug = should_debug;
  }

  _createClass(StompLogging, [{
    key: "debug",
    value: function debug(message) {
      if (this.should_debug) {
        console.log("debug: " + message);
      }
    }
  }, {
    key: "warn",
    value: function warn(message) {
      console.log("warn: " + message);
    }
  }, {
    key: "error",
    value: function error(message, die) {
      console.log("error: " + message);
      if (die) {
        process.exit(1);
      }
    }
  }, {
    key: "die",
    value: function die(message) {
      this.error(message, true);
    }
  }]);

  return StompLogging;
}();

var reallyDefined = exports.reallyDefined = function reallyDefined(varToTest) {
  return !(varToTest == null || varToTest == undefined);
};