import 'babel-polyfill';
import util from 'util';
import async from 'async';

import EsClient from './EsClient';
import ObservableQueue from './ObservableQueue';
import { getLogger } from './logger';

export default class EventTypeSwimlaneDispatcher {

  constructor({ subscriptions = [], apiKey = {}, logger = null, getEventHandler } = {}) {

    if (!logger) {
      logger = getLogger({ title: 'EventTypeSwimlaneDispatcher' });
    }

    Object.assign(this, { subscriptions, logger, getEventHandler });

    this.queues = {};

    this.createEsClientInstance(apiKey);
  }

  createEsClientInstance(apiKey) {
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

    this.esClient = new EsClient(esClientOpts);
  }

  startWorkflow(callback) {

    this.logger.info('Subscribe to: ', util.inspect(this.subscriptions, false, 10));

    if (!this.subscriptions.length) {
      return callback(new Error('The subscriptions array can not be empty'))
    }

    const functions = this.subscriptions.map(({subscriberId, entityTypesAndEvents}) => {

      const logger = this.logger;

      let receipts = [];

      return cb => {
        const subscribe = this.esClient.subscribe(subscriberId, entityTypesAndEvents, (err, receiptId) => {

          if (err) {
            logger.error('subscribe callback error', err);
            return cb(err);
          }

          logger.info(`The subscription has been established receipt-id: ${receiptId}`);

          if (receipts.indexOf(receiptId) < 0) {
            receipts.push(receiptId);
            cb(null, receiptId);
          }

        });

        this.runProcessEvents(subscribe);

      };
    });

    async.parallel(functions, callback);
  }

  runProcessEvents(subscription) {

    subscription.observable.subscribe(
      event => {

        //this.logger.debug(event);

        this.dispatch({ event, acknowledgeFn: subscription.acknowledge });
      },
      err => {
        this.logger.error(err);
      },
      () => {
        this.logger.debug('Completed')
      }
    )
  }

  dispatch({ event, acknowledgeFn }) {

    const { eventType, swimlane } = event;

    this.logger.debug(`eventType: ${eventType}, swimlane: ${swimlane}`);

    let queue = this.getQueue({ eventType, swimlane });

    if (!queue) {
      this.logger.debug(`Create new queue for eventType: ${eventType}, swimlane: ${swimlane}`);

      const eventHandler = this.getEventHandler(eventType);
      queue = new ObservableQueue({ eventType, swimlane, eventHandler, acknowledgeFn });

      this.saveQueue(queue);
    }

    queue.queueEvent(event);
  }

  getQueue({ eventType, swimlane }) {
    if(!this.queues[eventType]) {
      this.queues[eventType] = {};
    }

    return this.queues[eventType][swimlane];
  }

  saveQueue(queue) {

    const { eventType, swimlane } = queue;

    this.queues[eventType][swimlane] = queue;
  }

}
