'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _rx = require('rx');

var _rx2 = _interopRequireDefault(_rx);

var _logger = require('./logger');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var ObservableQueue = function () {
  function ObservableQueue(_ref) {
    var _this = this;

    var eventType = _ref.eventType;
    var swimlane = _ref.swimlane;
    var eventHandler = _ref.eventHandler;
    var executor = _ref.executor;
    var acknowledgeFn = _ref.acknowledgeFn;

    _classCallCheck(this, ObservableQueue);

    this.eventType = eventType;
    this.swimlane = swimlane;
    this.eventHandler = eventHandler;
    this.executor = executor;
    this.acknowledgeFn = acknowledgeFn;

    this.logger = (0, _logger.getLogger)({ title: 'Queue-' + this.eventType + '-' + this.swimlane });

    var observable = _rx2.default.Observable.create(this.observableCreateFn.bind(this));

    observable.map(this.createObservableHandler()).merge(1).subscribe(function (ack) {
      if (ack) {
        _this.logger.debug('acknowledge: ', ack);
        _this.acknowledgeFn(ack);
      }
    }, function (err) {
      _this.logger.error('Subscribe Error', err);
    }, function () {
      return _this.logger.debug('Disconnected!');
    });
  }

  _createClass(ObservableQueue, [{
    key: 'observableCreateFn',
    value: function observableCreateFn(observer) {
      this.observer = observer;
    }
  }, {
    key: 'queueEvent',
    value: function queueEvent(event) {
      this.observer.onNext(event);
    }
  }, {
    key: 'createObservableHandler',
    value: function createObservableHandler() {
      var _this2 = this;

      return function (event) {
        return _rx2.default.Observable.create(function (observer) {

          if (!_this2.eventHandler) {
            return observer.onError(new Error('No event handler for eventType: ' + event.eventType));
          }

          _this2.eventHandler.call(_this2.executor, event).then(function (result) {
            observer.onNext(event.ack);
            observer.onCompleted();
          }).catch(function (err) {
            observer.onError(err);
          });
        });
      };
    }
  }]);

  return ObservableQueue;
}();

exports.default = ObservableQueue;
module.exports = exports['default'];