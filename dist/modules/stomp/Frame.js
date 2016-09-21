'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

Object.defineProperty(exports, "__esModule", {
  value: true
});

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Frame = function () {
  function Frame() {
    _classCallCheck(this, Frame);

    this.command = null;
    this.headers = null;
    this.body = null;
  }

  _createClass(Frame, [{
    key: 'buildFrame',
    value: function buildFrame(args, wantReceipt) {

      this.command = args.command;
      this.headers = args.headers;
      this.body = args.body;

      if (wantReceipt) {

        var receipt = '';

        var receiptStamp = Math.floor(Math.random() * 99999999999).toString();

        if (this.headers.session !== undefined) {
          receipt = receiptStamp + "-" + this.headers.session;
        } else {
          receipt = receiptStamp;
        }
        this.headers.receipt = receipt;
      }
      return this;
    }
  }, {
    key: 'asString',
    value: function asString() {
      var _this = this;

      var headers = Object.keys(this.headers).map(function (headerName) {
        return headerName + ':' + _this.headers[headerName];
      });

      var frame = this.command + "\n";
      frame += headers.join("\n");
      frame += "\n\n";

      if (this.body) {
        frame += this.body;
      }

      frame += '\x00';

      return frame;
    }
  }]);

  return Frame;
}();

exports.default = Frame;
module.exports = exports['default'];