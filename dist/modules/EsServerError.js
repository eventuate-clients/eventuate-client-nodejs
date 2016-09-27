'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

Object.defineProperty(exports, "__esModule", {
  value: true
});

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var EsServerError = function (_Error) {
  _inherits(EsServerError, _Error);

  function EsServerError(jsonBody) {
    _classCallCheck(this, EsServerError);

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(EsServerError).call(this));

    Error.captureStackTrace(_this);

    _this.name = 'ES Server Error';

    if ((typeof jsonBody === 'undefined' ? 'undefined' : _typeof(jsonBody)) == 'object') {
      var timestamp = jsonBody.timestamp;
      var status = jsonBody.status;
      var statusCode = jsonBody.statusCode;
      var error = jsonBody.error;
      var exception = jsonBody.exception;
      var message = jsonBody.message;


      _this.timestamp = timestamp;
      _this.status = status;
      _this.statusCode = statusCode;
      _this.error = error;
      _this.exception = exception;

      if ((typeof message === 'undefined' ? 'undefined' : _typeof(message)) == 'object') {
        jsonBody.message = JSON.stringify(jsonBody.message);
      }

      _this.message = jsonBody.message;
      _this.path = jsonBody.path;
    } else {
      _this.message = jsonBody;
    }
    return _this;
  }

  return EsServerError;
}(Error);

exports.default = EsServerError;
module.exports = exports['default'];