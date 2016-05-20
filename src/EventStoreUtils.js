import util from 'util';
import Es from './es.js';

let EVENT_STORE_UTILS_RETRIES_COUNT = process.env.EVENT_STORE_UTILS_RETRIES_COUNT || 10;

class EventStoreUtils {

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
      apiKey: apiKey,
      httpKeepAlive: true,
      spaceName: process.env.EVENTUATE_SPACE_NAME || process.env.EVENT_STORE_SPACE_NAME
    };

    this.esClient = new Es.Client(esClientOpts);

    this.updateEntity = this.retryNTimes(EVENT_STORE_UTILS_RETRIES_COUNT, function(EntityClass, entityId, command, callback) {
      let entity = new EntityClass(),
        self = this;
      
      self.esClient.loadEvents(entity.entityTypeName, entityId, function (err, loadedEvents) {
        if (err) {
          callback(err);
        } else {

          if (loadedEvents.length > 0) {

            const entityVersion = loadedEvents[loadedEvents.length - 1].id;

            //iterate through the events calling entity.applyEvent(..)
            for (let prop in loadedEvents) {

              if (Object.prototype.hasOwnProperty.call(loadedEvents, prop)) {

                let event = loadedEvents[prop];

                let type = event.eventType.split('.').pop();

                let applyMethod = getEntityMethodName(entity, 'apply', type, 'applyEvent');
                //console.log(`Calling "${applyMethod}" for eventType: ${event.eventType}`);

                entity[applyMethod](event);
              }
            }

            let processCommandMethod = getEntityMethodName(entity, 'process', command.commandType, 'processCommand');

            self.esClient.update(
              entity.entityTypeName,
              entityId,
              entityVersion,
              entity[processCommandMethod](command),
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

    let errConditionFn;
    if (typeof (_errConditionFn) !== 'function') {
      ctx = _errConditionFn;
      errConditionFn = function(err) { return err; };
    } else {
      errConditionFn = _errConditionFn;
    }

    return function() {
      let count = times;
      let innerCtx = this || ctx;

      let args = [].slice.call(arguments);
      let worker = function(){
        fn.apply(innerCtx, args);
      };

      let oldCb = args.pop();
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

    let processCommandMethod = getEntityMethodName(entity, 'process', command.commandType, 'processCommand');

    let events = entity[processCommandMethod](command);
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
}


function getEntityMethodName(entity, prefix, type, defaultMethod) {

  let specificMethod = prefix + type;

  if (typeof entity[specificMethod] != 'undefined') {

    return specificMethod;
  } else if (typeof entity[defaultMethod] != 'undefined') {

    return defaultMethod;
  } else {

    throw new Error(`Entity does not have method to ${prefix} for ${type}: `)
  }
}

export default EventStoreUtils;

