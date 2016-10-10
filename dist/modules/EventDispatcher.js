'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

Object.defineProperty(exports, "__esModule", {
  value: true
});

require('babel-polyfill');

var _rx = require('rx');

var _rx2 = _interopRequireDefault(_rx);

var _util = require('util');

var _util2 = _interopRequireDefault(_util);

var _EsClient = require('./EsClient');

var _EsClient2 = _interopRequireDefault(_EsClient);

var _logger = require('./logger');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var EventDispatcher = function () {
  function EventDispatcher() {
    var _ref = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

    var getEventHandler = _ref.getEventHandler;
    var _ref$subscriptions = _ref.subscriptions;
    var subscriptions = _ref$subscriptions === undefined ? [] : _ref$subscriptions;
    var _ref$logger = _ref.logger;
    var logger = _ref$logger === undefined ? null : _ref$logger;
    var _ref$worker = _ref.worker;
    var worker = _ref$worker === undefined ? {} : _ref$worker;

    _classCallCheck(this, EventDispatcher);

    if (!logger) {
      logger = (0, _logger.getLogger)({ title: 'EventDispatcher' });
    }

    Object.assign(this, { getEventHandler: getEventHandler, subscriptions: subscriptions, logger: logger, worker: worker });
  }

  _createClass(EventDispatcher, [{
    key: 'run',
    value: function run(subscription) {
      var _this = this;

      subscription.observable.map(createObservable.call(this, this.getEventHandler)).merge(1).subscribe(function (ack) {
        if (ack) {
          _this.logger.debug('acknowledge: ', ack);
          subscription.acknowledge(ack);
        }
      }, function (err) {
        return _this.logger.error('Subscribe Error', err);
      }, function () {
        return _this.logger.debug('Disconnected!');
      });
    }
  }]);

  return EventDispatcher;
}();

exports.default = EventDispatcher;
;

function createObservable(getEventHandler) {
  var _this2 = this;

  return function (event) {
    return _rx2.default.Observable.create(function (observer) {

      var eventHandler = getEventHandler.call(_this2.worker, event.eventType);

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