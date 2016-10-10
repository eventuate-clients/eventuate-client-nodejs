'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

Object.defineProperty(exports, "__esModule", {
  value: true
});

require('babel-polyfill');

var _util = require('util');

var _util2 = _interopRequireDefault(_util);

var _ObservableQueue = require('./ObservableQueue');

var _ObservableQueue2 = _interopRequireDefault(_ObservableQueue);

var _logger = require('./logger');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var EventTypeSwimlaneDispatcher = function () {
  function EventTypeSwimlaneDispatcher() {
    var _ref = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

    var _ref$logger = _ref.logger;
    var logger = _ref$logger === undefined ? null : _ref$logger;
    var getEventHandler = _ref.getEventHandler;
    var subscription = _ref.subscription;
    var executor = _ref.executor;

    _classCallCheck(this, EventTypeSwimlaneDispatcher);

    if (!logger) {
      logger = (0, _logger.getLogger)({ title: 'EventTypeSwimlaneDispatcher' });
    }

    this.getEventHandler = getEventHandler;
    this.logger = logger;
    this.subscription = subscription;
    this.executor = executor;

    this.queues = {};
  }

  _createClass(EventTypeSwimlaneDispatcher, [{
    key: 'run',
    value: function run() {
      var _this = this;

      this.subscription.observable.subscribe(function (event) {
        //this.logger.debug(event);
        _this.dispatch(event);
      }, function (err) {
        _this.logger.error(err);
      }, function () {
        _this.logger.debug('Completed');
      });
    }
  }, {
    key: 'dispatch',
    value: function dispatch(event) {
      var eventType = event.eventType;
      var swimlane = event.swimlane;


      this.logger.debug('eventType: ' + eventType + ', swimlane: ' + swimlane);

      var queue = this.getQueue({ eventType: eventType, swimlane: swimlane });

      if (!queue) {
        this.logger.debug('Create new queue for eventType: ' + eventType + ', swimlane: ' + swimlane);

        var eventHandler = this.getEventHandler(eventType);
        queue = new _ObservableQueue2.default({ eventType: eventType, swimlane: swimlane, eventHandler: eventHandler, executor: this.executor, acknowledgeFn: this.subscription.acknowledge });

        this.saveQueue(queue);
      }

      queue.queueEvent(event);
    }
  }, {
    key: 'getQueue',
    value: function getQueue(_ref2) {
      var eventType = _ref2.eventType;
      var swimlane = _ref2.swimlane;

      if (!this.queues[eventType]) {
        this.queues[eventType] = {};
      }

      return this.queues[eventType][swimlane];
    }
  }, {
    key: 'saveQueue',
    value: function saveQueue(queue) {
      var eventType = queue.eventType;
      var swimlane = queue.swimlane;


      this.queues[eventType][swimlane] = queue;
    }
  }]);

  return EventTypeSwimlaneDispatcher;
}();

exports.default = EventTypeSwimlaneDispatcher;
module.exports = exports['default'];