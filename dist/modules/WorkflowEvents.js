'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

Object.defineProperty(exports, "__esModule", {
  value: true
});

require('babel-polyfill');

var _rx = require('rx');

var _rx2 = _interopRequireDefault(_rx);

var _async = require('async');

var _async2 = _interopRequireDefault(_async);

var _util = require('util');

var _util2 = _interopRequireDefault(_util);

var _EsClient = require('./EsClient');

var _EsClient2 = _interopRequireDefault(_EsClient);

var _logger = require('./logger');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var defaultLogger = (0, _logger.getLogger)({ title: 'WorkflowEvents' });

var WorkflowEvents = function () {
  function WorkflowEvents() {
    var _ref = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

    var getEventHandler = _ref.getEventHandler;
    var _ref$subscriptions = _ref.subscriptions;
    var subscriptions = _ref$subscriptions === undefined ? [] : _ref$subscriptions;
    var _ref$logger = _ref.logger;
    var logger = _ref$logger === undefined ? null : _ref$logger;
    var _ref$worker = _ref.worker;
    var worker = _ref$worker === undefined ? {} : _ref$worker;
    var _ref$apiKey = _ref.apiKey;
    var apiKey = _ref$apiKey === undefined ? {} : _ref$apiKey;

    _classCallCheck(this, WorkflowEvents);

    if (!logger) {
      logger = defaultLogger;
    }

    Object.assign(this, { getEventHandler: getEventHandler, subscriptions: subscriptions, logger: logger, worker: worker });

    if (!apiKey.id) {
      apiKey.id = process.env.EVENTUATE_API_KEY_ID || process.env.EVENT_STORE_USER_ID;
    }

    if (!apiKey.secret) {
      apiKey.secret = process.env.EVENTUATE_API_KEY_SECRET || process.env.EVENT_STORE_PASSWORD;
    }

    if (!apiKey.id || !apiKey.secret) {
      throw new Error('Use `EVENTUATE_API_KEY_ID` and `EVENTUATE_API_KEY_SECRET` to set Event Store auth data');
    }

    var esClientOpts = {
      apiKey: apiKey,
      httpKeepAlive: true,
      spaceName: process.env.EVENTUATE_SPACE_NAME || process.env.EVENT_STORE_SPACE_NAME
    };

    this.esClient = new _EsClient2.default(esClientOpts);
  }

  _createClass(WorkflowEvents, [{
    key: 'startWorkflow',
    value: function startWorkflow(callback) {
      var _this = this;

      this.logger.info('Subscribe to: ', _util2.default.inspect(this.subscriptions, false, 10));

      var functions = [];

      this.subscriptions.forEach(function (_ref2) {
        var subscriberId = _ref2.subscriberId;
        var entityTypesAndEvents = _ref2.entityTypesAndEvents;


        var logger = _this.logger;

        var receipts = [];

        functions.push(function (cb) {
          var subscribe = _this.esClient.subscribe(subscriberId, entityTypesAndEvents, function (err, receiptId) {

            if (err) {
              logger.error('subscribe callback error', err);
              cb(err);
              return;
            }

            logger.info('The subscription has been established receipt-id: ' + receiptId);

            if (receipts.indexOf(receiptId) < 0) {
              receipts.push(receiptId);
              cb(null, receiptId);
            }
          });

          _this.runProcessEvents(subscribe);
        });
      });

      _async2.default.parallel(functions, callback);
    }
  }, {
    key: 'runProcessEvents',
    value: function runProcessEvents(subscription) {
      var _this2 = this;

      subscription.observable.map(createObservable.call(this, this.getEventHandler)).merge(1).subscribe(function (ack) {
        if (ack) {
          _this2.logger.debug('acknowledge: ', ack);
          subscription.acknowledge(ack);
        }
      }, function (err) {
        return _this2.logger.error('Subscribe Error', err);
      }, function () {
        return _this2.logger.debug('Disconnected!');
      });
    }
  }]);

  return WorkflowEvents;
}();

exports.default = WorkflowEvents;
;

function createObservable(getEventHandler) {
  var _this3 = this;

  return function (event) {
    return _rx2.default.Observable.create(function (observer) {

      var eventHandler = getEventHandler.call(_this3.worker, event.eventType);

      if (!eventHandler) {
        return observer.onError(new Error('No event handler for eventType: ' + event.eventType));
      }

      eventHandler(event).then(function (result) {
        observer.onNext(event.ack);
        observer.onCompleted();
      }, observer.onError);
    });
  };
}
module.exports = exports['default'];