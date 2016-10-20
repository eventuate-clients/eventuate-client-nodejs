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

    this.updateEntity = this.retryNTimes(
      {
        times: EVENT_STORE_UTILS_RETRIES_COUNT,

        fn: (EntityClass, entityId, command, options, callback) => {

          return new Promise((resolve, reject) => {

            if (!callback) {
              callback = options;
              options = undefined;
            }

            const entity = new EntityClass();
            const { entityTypeName } = entity;

            return this.loadEvents({ entityTypeName, entityId, options })
              .then(loadedEvents => {

                const entityVersion = this.getEntityVersionFromEvents(loadedEvents);

                if (!entityVersion) {
                  return callback(new Error(`Can not get entityVersion: no events for ${entityTypeName} ${entityId}`));
                }

                //iterate through the events calling entity.applyEvent(..)
                this.applyEntityEvents(loadedEvents, entity);

                const processCommandMethod = this.getProcessCommandMethod(entity, command.commandType);

                const events = processCommandMethod.call(entity, command);

                return this.esClient.update(entityTypeName, entityId, entityVersion, events, options)
                  .then(result => {

                    logger.debug(`Updated entity: ${EntityClass.name} ${entityId} ${JSON.stringify(result)}`);
                    //callback(null, result);
                    return Promise.resolve(result);
                  })
                  .catch(error => {
                    logger.error(`Update entity failed: ${EntityClass.name} ${entityId} ${entityVersion}`);

                    if (error.statusCode == 409) {

                      logger.debug(`Updated before, loading events instead - ${EntityClass.name} ${entityId} ${JSON.stringify(result)}`);

                      delete options.triggeringEventToken;

                      return this.loadEvents(entityTypeName, entityId, options)
                        .then(loadedEvents => {

                          //callback(null, loadedEvents.pop());
                          return Promise.resolve(loadedEvents.pop());
                        })
                        .catch(err => {

                          //callback(err);
                          return Promise.reject(err);
                        });

                    }

                    //callback(error);
                    return Promise.reject(error);

                  });
              })
              .catch(err => {
                logger.error(`Load events failed: ${entityTypeName} ${entityId}`);
                logger.error(err);
                //return callback(err);
                return Promise.reject(err);
              });
          });

        }
      });
  }

  retryNTimes({ times, fn, ctx, errConditionFn }) {


    if (typeof errConditionFn !== 'function') {
      errConditionFn = err => err;
    }

    return function () {
      let count = times;
      let innerCtx = this || ctx;

      let args = [].slice.call(arguments);

      let oldCb = args.pop();
      if (typeof oldCb !== 'function') {
        throw new TypeError('Last parameter is expected to be a function');
      }

      args.push((err, result) => {

        if (!errConditionFn(err, result)) {
          return oldCb(err, result);
        }

      });

      var worker = function () {
        fn.apply(innerCtx, args)
          .then(result => {

            return Promise.resolve(result);
          })
          .catch(err => {

            count--;

            if (!count) {
              return Promise.reject(err);
            }

            logger.info(`retryNTimes  ${count} - ${args[1]} - ${util.inspect(args[2])}`);
            setTimeout(worker, 100);
          });
      };

      worker();
    };
  }

  createEntity({ EntityClass, command, options }) {

    const entity = new EntityClass();

    const processCommandMethod = this.getProcessCommandMethod(entity, command.commandType);

    const events = processCommandMethod.call(entity, command);

    return this.esClient.create(entity.entityTypeName, events, options)
      .then(result=> {
        logger.debug(`Created entity: ${EntityClass.name} ${result.entityIdTypeAndVersion.entityId} ${JSON.stringify(result)}`);
        return result;
      },
      err => {
        logger.error(`Create entity failed: ${EntityClass.name}`);
        return err;
      })
  }

  loadEvents({ entityTypeName, entityId, options }) {

    return this.esClient.loadEvents(entityTypeName, entityId, options);
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

  getEntityVersionFromEvents(loadedEvents) {

    if (loadedEvents.length <= 0) {
      return false;
    }

    return loadedEvents[loadedEvents.length - 1].id;
  }

  applyEntityEvents(loadedEvents, entity) {

    loadedEvents.forEach(event => {

      const type = event.eventType.split('.').pop();

      const applyMethod = this.getApplyMethod(entity, type);

      applyMethod.call(entity, event);
    });

  }

}

