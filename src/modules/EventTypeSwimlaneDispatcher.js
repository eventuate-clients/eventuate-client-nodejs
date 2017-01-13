import 'babel-polyfill';
import util from 'util';

import ObservableQueue from './ObservableQueue';
import { getLogger } from './logger';

export default class EventTypeSwimlaneDispatcher {

  constructor({ eventHandlers, logger, executor = {} } = {}) {

    if (!logger) {
      logger = getLogger({ title: 'EventTypeSwimlaneDispatcher' });
    }

    this.eventHandlers =  eventHandlers;
    this.logger = logger;
    this.executor = executor;

    this.queues = {};

  }

  dispatch(event) {

    return new Promise((resolve, reject) => {

      const { eventType, swimlane, entityType } = event;

      this.logger.debug(`eventType: ${eventType}, swimlane: ${swimlane}, entityType: ${entityType}`);

      let queue = this.getQueue({ eventType, swimlane });

      if (!queue) {
        this.logger.debug(`Create new queue for eventType: ${eventType}, swimlane: ${swimlane}`);

        const eventHandler = this.eventHandlers[entityType][eventType];

        if (!eventHandler) {
          return Promise.reject(new Error(`No event handler for eventType: ${eventType}`));
        }

        queue = new ObservableQueue({ eventType, swimlane, eventHandler, executor: this.executor });

        this.saveQueue(queue);
      }

      queue.queueEvent( { event, resolve, reject });

    });

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
