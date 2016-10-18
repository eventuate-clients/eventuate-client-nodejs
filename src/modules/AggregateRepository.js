import util from 'util';
import EsClient from './EsClient';
import { getLogger } from './logger';

const logger = getLogger({ title: 'AggregateRepository' });

const EVENT_STORE_UTILS_RETRIES_COUNT = process.env.EVENT_STORE_UTILS_RETRIES_COUNT || 10;

export default class AggregateRepository {

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

    const esClientOpts = {
      apiKey: apiKey,
      httpKeepAlive: true,
      spaceName: process.env.EVENTUATE_SPACE_NAME || process.env.EVENT_STORE_SPACE_NAME
    };

    logger.debug('Using EsClient options:', esClientOpts);

    this.esClient = new EsClient(esClientOpts);

    this.updateEntity = this.retryNTimes(EVENT_STORE_UTILS_RETRIES_COUNT, (EntityClass, entityId, command, options, callback) => {

      if (!callback) {
        callback = options;
        options = undefined;
      }

      const entity = new EntityClass();

      this.loadEvents(entity.entityTypeName, entityId, options, (err, loadedEvents) => {

        if (err) {
          logger.error(`Load events failed: ${entity.entityTypeName} ${entityId}`);
          return callback(err);
        }

        if (loadedEvents.length <= 0) {
          return callback(new Error(`Can not get entityVersion: no events for ${entity.entityTypeName} ${entityId}`));
        }

        const { id: entityVersion } = loadedEvents[loadedEvents.length - 1];

        //iterate through the events calling entity.applyEvent(..)

        loadedEvents.forEach(event => {

          const type = event.eventType.split('.').pop();

          const applyMethod = this.getApplyMethod(entity, type);

          applyMethod.call(entity, event);
        });

        const processCommandMethod = this.getProcessCommandMethod(entity, command.commandType);

        const events = processCommandMethod.call(entity, command);

        this.esClient.update(entity.entityTypeName, entityId, entityVersion, events, options, (error, result) => {
          if (error) {

            logger.error(`Update entity failed: ${EntityClass.name} ${entityId} ${entityVersion}`);

            if (error.statusCode == 409) {

              logger.debug(`Updated before, loading events instead - ${EntityClass.name} ${entityId} ${JSON.stringify(result)}`);
              delete options.triggeringEventToken;

              return this.loadEvents(entity.entityTypeName, entityId, options, (err, loadedEvents) => {

                if (err) {
                  return callback(err);
                }

                return loadedEvents.pop();
              });


            } else {

              return callback(error);
            }

          }

          logger.debug(`Updated entity: ${EntityClass.name} ${entityId} ${JSON.stringify(result)}`);

          callback(null, result);
        });
      });
    }, err => {

      console.log(`err.statusCode: ${err.statusCode}`);
      //return err && err.statusCode === 409;
      return err;
    });
  }

  retryNTimes(times, fn, _errConditionFn, ctx) {

    let errConditionFn;
    if (typeof _errConditionFn !== 'function') {
      ctx = _errConditionFn;
      errConditionFn = function (err) {
        return err;
      };
    } else {
      errConditionFn = _errConditionFn;
    }

    return function () {
      let count = times;
      let innerCtx = this || ctx;

      let args = [].slice.call(arguments);
      let worker = function () {
        fn.apply(innerCtx, args);
      };

      let oldCb = args.pop();
      if (typeof oldCb !== 'function') {
        throw new TypeError('Last parameter is expected to be a function');
      }
      args.push(function (err, result) {
        if (errConditionFn(err, result)) {
          count--;
          if (count) {
            logger.info(`retryNTimes  ${count} - ${args[1]} - ${util.inspect(args[2])}`);
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

    const entity = new EntityClass();

    const processCommandMethod = this.getProcessCommandMethod(entity, command.commandType);

    const events = processCommandMethod.call(entity, command);

    this.esClient.create(entity.entityTypeName, events, (err, result) => {
      if (err) {
        logger.error(`Create entity failed: ${EntityClass.name}`);
        return callback(err);
      }

      logger.debug(`Created entity: ${EntityClass.name} ${result.entityIdTypeAndVersion.entityId} ${JSON.stringify(result)}`);
      callback(null, result);
    });
  }

  loadEvents(entityTypeName, entityId, options, callback) {

    if (!callback) {
      callback = options;
      options = undefined;
    }

    this.esClient.loadEvents(entityTypeName, entityId, options, (err, loadedEvents) => {
      if (err) {
        logger.error(`Load events failed: ${entityTypeName} ${entityId}`);
        return callback(err);
      }

      logger.debug(`Loaded events: ${entityTypeName} ${entityId} ${JSON.stringify(loadedEvents)}`);
      callback(null, loadedEvents);
    });
  }


  getApplyMethod(entity, eventType) {

    const defaultMethod = 'applyEvent';
    const methodName = `apply${eventType}`;

    if (typeof entity[methodName] == 'function') {

      return entity[methodName];
    } else if (typeof entity[defaultMethod] == 'function') {

      return entity[defaultMethod];
    } else {

      throw new Error(`Entity does not have method to ${prefix} for ${eventType}.`);
    }
  }

  getProcessCommandMethod(entity, commandType) {

    const defaultMethod = 'processCommand';
    let methodName = `process${commandType}`;

    if (typeof entity[methodName] == 'function') {

      return entity[methodName];
    } else if (typeof entity[defaultMethod] == 'function') {

      return entity[defaultMethod];
    } else {

      throw new Error(`Entity does not have method to ${prefix} for ${commandType}.`);
    }
  }

}

