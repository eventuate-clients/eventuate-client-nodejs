'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

Object.defineProperty(exports, "__esModule", {
  value: true
});

require('babel-polyfill');

var _EsClient = require('./EsClient');

var _EsClient2 = _interopRequireDefault(_EsClient);

var _rx = require('rx');

var _rx2 = _interopRequireDefault(_rx);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var defaultLogger = {
  debug: process.env.LOG_LEVEL == 'DEBUG' ? console.log : function () {},
  info: console.log,
  error: console.error
};

var result = function () {
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
    value: function startWorkflow() {
      var _this = this;

      this.subscriptions.forEach(function (_ref2) {
        var subscriberId = _ref2.subscriberId;
        var entityTypesAndEvents = _ref2.entityTypesAndEvents;

        var logger = _this.logger;
        var subscribe = _this.esClient.subscribe(subscriberId, entityTypesAndEvents, function (err, receiptId) {
          if (err) {
            logger.error('subscribe callback error', err);
            return;
          }
          logger.info('The subscription has been established\n        receipt-id:' + receiptId + '\n        ');
        });

        _this.runProcessEvents(subscribe);
      });
    }
  }, {
    key: 'runProcessEvents',
    value: function runProcessEvents(subscription) {
      var _this2 = this;

      subscription.observable
      //.map(logEventTime)
      .map(createObservable.call(this, this.getEventHandler)).merge(1).subscribe(function (ack) {
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

function logEventTime(event) {
  var _event$eventId$split = event.eventId.split('-');

  var _event$eventId$split2 = _slicedToArray(_event$eventId$split, 1);

  var eventTimePart = _event$eventId$split2[0];

  var eventTime = new Date(parseInt(eventTimePart, 16));
  console.log('New Event (created at ' + eventTime + '): ', event);
  return event;
}

function createObservable(getEventHandler) {
  var _this3 = this;

  return function (event) {
    return _rx2.default.Observable.create(function (observer) {

      var eventHandler = getEventHandler.call(_this3.worker, event.eventType);

      if (eventHandler) {
        eventHandler(event).then(function (result) {
          observer.onNext(event.ack);
          observer.onCompleted();
        }, function (error) {
          observer.onNext();
          observer.onCompleted();
        });
      } else {
        _this3.logger.debug('No handler for eventType: ', event.eventType);
        observer.onNext();
        observer.onCompleted();
      }
    });
  };
}

exports.default = result;
module.exports = exports['default'];