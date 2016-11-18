'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _EsClient = require('./EsClient');

var _EsClient2 = _interopRequireDefault(_EsClient);

var _logger = require('./logger');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Subscriber = function () {
  function Subscriber() {
    var _ref = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    var subscriptions = _ref.subscriptions;
    var _ref$apiKey = _ref.apiKey;
    var apiKey = _ref$apiKey === undefined ? {} : _ref$apiKey;
    var logger = _ref.logger;

    _classCallCheck(this, Subscriber);

    this.logger = logger || (0, _logger.getLogger)({ title: 'Subscriber' });
    this.subscriptions = subscriptions;
    this.apiKey = apiKey;

    this.esClient = this.createEsClientInstance();
  }

  _createClass(Subscriber, [{
    key: 'createEsClientInstance',
    value: function createEsClientInstance() {
      if (!this.apiKey.id) {
        this.apiKey.id = process.env.EVENTUATE_API_KEY_ID || process.env.EVENT_STORE_USER_ID;
      }

      if (!this.apiKey.secret) {
        this.apiKey.secret = process.env.EVENTUATE_API_KEY_SECRET || process.env.EVENT_STORE_PASSWORD;
      }

      if (!this.apiKey.id || !this.apiKey.secret) {
        throw new Error('Use `EVENTUATE_API_KEY_ID` and `EVENTUATE_API_KEY_SECRET` to set Event Store auth data');
      }

      var esClientOpts = {
        apiKey: this.apiKey,
        httpKeepAlive: true,
        spaceName: process.env.EVENTUATE_SPACE_NAME || process.env.EVENT_STORE_SPACE_NAME,
        debug: false

      };

      return new _EsClient2.default(esClientOpts);
    }
  }, {
    key: 'subscribe',
    value: function subscribe() {
      var _this = this;

      return this.subscriptions.map(function (_ref2) {
        var subscriberId = _ref2.subscriberId;
        var entityTypesAndEvents = _ref2.entityTypesAndEvents;


        return _this.esClient.subscribe(subscriberId, entityTypesAndEvents, function (err, receiptId) {

          if (err) {
            return callback(err);
          }

          _this.logger.info('The subscription has been established receipt-id: ' + receiptId);
        });
      });
    }
  }]);

  return Subscriber;
}();

exports.default = Subscriber;
module.exports = exports['default'];