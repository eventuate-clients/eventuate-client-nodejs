'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _linkedlist = require('linkedlist');

var _linkedlist2 = _interopRequireDefault(_linkedlist);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var AckOrderTracker = function () {
  function AckOrderTracker() {
    _classCallCheck(this, AckOrderTracker);

    this.pendingHeaders = new _linkedlist2.default();
  }

  _createClass(AckOrderTracker, [{
    key: 'add',
    value: function add(ackHeader) {
      this.pendingHeaders.push(new PendingAckHeader(ackHeader));
    }
  }, {
    key: 'ack',
    value: function ack(ackHeader) {}
  }, {
    key: 'getPendingHeaders',
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
    key: 'toString',
    value: function toString() {
      return JSON.stringify(this);
    }
  }]);

  return PendingAckHeader;
}();

module.exports = exports['default'];