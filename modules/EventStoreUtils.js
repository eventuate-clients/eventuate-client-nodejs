'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _util = require('util');

var _util2 = _interopRequireDefault(_util);

var _es = require('./es.js');

var _es2 = _interopRequireDefault(_es);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var EVENT_STORE_UTILS_RETRIES_COUNT = process.env.EVENT_STORE_UTILS_RETRIES_COUNT || 10;

var EventStoreUtils = (function () {
  function EventStoreUtils() {
    var _ref = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

    var _ref$apiKey = _ref.apiKey;
    var apiKey = _ref$apiKey === undefined ? {} : _ref$apiKey;

    _classCallCheck(this, EventStoreUtils);

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
      url: process.env.EVENTUATE_URL || process.env.EVENT_STORE_URL || "https://api.eventuate.io",
      stomp: {
        host: process.env.EVENTUATE_STOMP_SERVER_HOST || process.env.EVENT_STORE_STOMP_SERVER_HOST || 'api.eventuate.io',
        port: process.env.EVENTUATE_STOMP_SERVER_PORT || process.env.EVENT_STORE_STOMP_SERVER_PORT || 61614
      },
      apiKey: apiKey,
      httpKeepAlive: true,
      spaceName: process.env.EVENTUATE_SPACE_NAME || process.env.EVENT_STORE_SPACE_NAME
    };

    if (!esClientOpts.url || !esClientOpts.stomp.host || !esClientOpts.stomp.port) {
      throw new Error('Use `EVENTUATE_URL`, `EVENTUATE_STOMP_SERVER_HOST` and `EVENTUATE_STOMP_SERVER_PORT` to connect Event Store');
    }

    this.esClient = new _es2.default.Client(esClientOpts);

    this.updateEntity = this.retryNTimes(EVENT_STORE_UTILS_RETRIES_COUNT, function (EntityClass, entityId, command, callback) {
      var entity = new EntityClass(),
          self = this;

      self.esClient.loadEvents(entity.entityTypeName, entityId, function (err, loadedEvents) {
        if (err) {
          callback(err);
        } else {

          if (loadedEvents.length > 0) {
            var entityVersion = loadedEvents[loadedEvents.length - 1].id;

            //iterate through the events calling entity.applyEvent(..)
            for (var prop in loadedEvents) {
              if (Object.prototype.hasOwnProperty.call(loadedEvents, prop)) {
                entity = entity.applyEvent(loadedEvents[prop]);
              }
            }

            self.esClient.update(entity.entityTypeName, entityId, entityVersion, entity.processCommand(command), function (error, updatedEntityAndEventInfo) {
              if (error) {
                callback(error);
                return;
              }

              callback(null, updatedEntityAndEventInfo);
            });
          } else {
            callback(new Error('Can not get entityVersion: no events for ' + entity.entityTypeName + ' ' + entityId));
          }
        }
      });
    }, function (err) {
      return err && err.statusCode === 409;
    });
  }

  _createClass(EventStoreUtils, [{
    key: 'retryNTimes',
    value: function retryNTimes(times, fn, _errConditionFn, ctx) {

      var errConditionFn;
      if (typeof _errConditionFn !== 'function') {
        ctx = _errConditionFn;
        errConditionFn = function errConditionFn(err) {
          return err;
        };
      } else {
        errConditionFn = _errConditionFn;
      }

      return function () {
        var count = times;
        var innerCtx = this || ctx;

        var args = [].slice.call(arguments);
        var worker = function worker() {
          fn.apply(innerCtx, args);
        };

        var oldCb = args.pop();
        if (typeof oldCb !== 'function') {
          throw new TypeError('Last parameter is expected to be a function');
        }
        args.push(function (err, result) {
          if (errConditionFn(err, result)) {
            count--;
            if (count) {
              console.log('retryNTimes ' + count + ' - ' + args[1] + ' - ' + _util2.default.inspect(args[2]));
              setTimeout(worker, 100);
            } else {
              oldCb(err, result);
            }
          } else {
            oldCb(err, result);
          }
        });

        worker();
      };
    }
  }, {
    key: 'createEntity',
    value: function createEntity(EntityClass, command, callback) {

      var entity = new EntityClass();

      var events = entity.processCommand(command);
      this.esClient.create(entity.entityTypeName, events, function (err, createdEntityAndEventInfo) {
        if (err) {
          callback(err);
          return;
        }

        callback(null, createdEntityAndEventInfo);
      });
    }
  }, {
    key: 'loadEvents',
    value: function loadEvents(entityTypeName, entityId, callback) {

      this.esClient.loadEvents(entityTypeName, entityId, function (err, loadedEvents) {
        if (err) {
          callback(err);
          return;
        }

        callback(null, loadedEvents);
      });
    }
  }]);

  return EventStoreUtils;
})();

exports.default = EventStoreUtils;
module.exports = exports['default'];