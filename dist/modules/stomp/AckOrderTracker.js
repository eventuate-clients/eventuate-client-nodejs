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

        return !acked && ackHeader === ah;
      });

      if (!pendingHeader) {
        console.error("Didn't find " + ah);
        return [];
      }

      pendingHeader.acked = true;
      var ackedHeaders = [];

      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = this.pendingHeaders[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var _step$value = _step.value;
          var acked = _step$value.acked;
          var ackHeader = _step$value.ackHeader;

          if (!acked) {
            break;
          }
          ackedHeaders.push(ackHeader);
        }
      } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion && _iterator.return) {
            _iterator.return();
          }
        } finally {
          if (_didIteratorError) {
            throw _iteratorError;
          }
        }
      }

      this.pendingHeaders.splice(0, ackedHeaders.length);

      return ackedHeaders;
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