import util from 'util';
import Es from './es.js';

let EVENT_STORE_UTILS_RETRIES_COUNT = process.env.EVENT_STORE_UTILS_RETRIES_COUNT || 10;

const EventStoreUtils = class {
  constructor({ apiKey = {} } = {}) {

    if (!apiKey.id) {
      apiKey.id = process.env.EVENTUATE_API_KEY_ID || process.env.EVENT_STORE_USER_ID;
    }

    if (!apiKey.secret) {
      apiKey.secret = process.env.EVENTUATE_API_KEY_SECRET || process.env.EVENT_STORE_PASSWORD;
    }

    if (!apiKey.id || !apiKey.secret) {
      throw new Error('Use `EVENTUATE_API_KEY_ID` and `EVENTUATE_API_KEY_SECRET` to set Event Store auth data');
    }

    let esClientOpts = {
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

    this.esClient = new Es.Client(esClientOpts);

    this.updateEntity = this.retryNTimes(EVENT_STORE_UTILS_RETRIES_COUNT, function(EntityClass, entityId, command, callback) {
      var entity = new EntityClass(),
        self = this;
      
      self.esClient.loadEvents(entity.entityTypeName, entityId, function(err, loadedEvents){
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

            self.esClient.update(
              entity.entityTypeName,
              entityId,
              entityVersion,
              entity.processCommand(command),
              function(error, updatedEntityAndEventInfo) {
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
    }, function(err) {
      return (err && err.statusCode === 409);
    });
  }

  retryNTimes(times, fn, _errConditionFn, ctx) {

    var errConditionFn;
    if (typeof (_errConditionFn) !== 'function') {
      ctx = _errConditionFn;
      errConditionFn = function(err) { return err; };
    } else {
      errConditionFn = _errConditionFn;
    }

    return function() {
      var count = times;
      var innerCtx = this || ctx;

      var args = [].slice.call(arguments);
      var worker = function(){
        fn.apply(innerCtx, args);
      };

      var oldCb = args.pop();
      if (typeof oldCb !== 'function') {
        throw new TypeError('Last parameter is expected to be a function');
      }
      args.push(function(err, result) {
        if (errConditionFn(err, result)) {
          count--;
          if (count) {
            console.log('retryNTimes ' + count + ' - ' + args[1] + ' - ' + util.inspect(args[2]));
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

  createEntity(EntityClass, command, callback) {

    let entity = new EntityClass();

    let events = entity.processCommand(command);
    this.esClient.create(entity.entityTypeName, events, (err, createdEntityAndEventInfo) => {
      if (err) {
        callback(err);
        return;
      }

      callback(null, createdEntityAndEventInfo);

    });
  }

  loadEvents(entityTypeName, entityId, callback) {

    this.esClient.loadEvents(entityTypeName, entityId, (err, loadedEvents) => {
      if (err) {
        callback(err);
        return;
      }

      callback(null, loadedEvents);

    });
  }
};

export default EventStoreUtils;

