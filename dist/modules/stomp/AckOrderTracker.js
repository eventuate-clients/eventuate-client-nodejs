"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

Object.defineProperty(exports, "__esModule", {
  value: true
});

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var AckOrderTracker = function () {
  function AckOrderTracker() {
    _classCallCheck(this, AckOrderTracker);

    this.pendingHeaders = [];
  }

  _createClass(AckOrderTracker, [{
    key: "add",
    value: function add(ackHeader) {
      var pendingHeader = new PendingAckHeader(ackHeader);
      this.pendingHeaders.push(pendingHeader);
    }
  }, {
    key: "ack",
    value: function ack(ah) {

      var pendingHeader = this.pendingHeaders.find(function (_ref) {
        var acked = _ref.acked;
        var ackHeader = _ref.ackHeader;

        return acked === false && ackHeader === ah;
      });

      if (pendingHeader) {
        pendingHeader.acked = true;

        return this.pendingHeaders.filter(function (_ref2, index, arr) {
          var acked = _ref2.acked;

          if (acked == true) {
            arr.splice(index, 1);
            return true;
          }
        }).map(function (_ref3) {
          var ackHeader = _ref3.ackHeader;
          return ackHeader;
        });
      } else {
        console.error("Didn't find " + ah);
        return [];
      }
    }
  }, {
    key: "getPendingHeaders",
    value: function getPendingHeaders() {
      return this.pendingHeaders;
    }
  }]);

  return AckOrderTracker;
}();

exports.default = AckOrderTracker;

var PendingAckHeader = function () {
  function PendingAckHeader(ackHeader) {
    _classCallCheck(this, PendingAckHeader);

    this.ackHeader = ackHeader;
    this.acked = false;
  }

  _createClass(PendingAckHeader, [{
    key: "toString",
    value: function toString() {
      return JSON.stringify(this);
    }
  }]);

  return PendingAckHeader;
}();

module.exports = exports['default'];