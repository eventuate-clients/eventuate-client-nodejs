import 'babel-polyfill';

import ObservableQueue from './ObservableQueue';
import { getLogger } from './logger';

export default class EventTypeSwimlaneDispatcher {

  constructor({ eventHandlers, logger, executor = {} } = {}) {

    if (!logger) {
      logger = getLogger({ title: 'EventTypeSwimlaneDispatcher' });
    }

    Object.assign(this, { eventHandlers, logger, executor });

    this.queues = {};

  }

  dispatch(event) {

    return new Promise((resolve, reject) => {

      const { eventType, swimlane, entityType } = event;

      this.logger.debug(`eventType: ${eventType}, swimlane: ${swimlane}, entityType: ${entityType}`);

      let queue = this.getQueue({ entityType, swimlane });

      if (!queue) {
        this.logger.debug(`Create new queue for eventType: ${entityType}, swimlane: ${swimlane}`);

        queue = new ObservableQueue({ entityType, swimlane, eventHandlers: this.eventHandlers, executor: this.executor });

        this.saveQueue(queue);
      }

      queue.queueEvent( { event, resolve, reject });

    });

  }

  getQueue({ entityType, swimlane }) {
    if(!this.queues[entityType]) {
      this.queues[entityType] = {};
    }

    return this.queues[entityType][swimlane];
  }

  saveQueue(queue) {

    const { entityType, swimlane } = queue;

    this.queues[entityType][swimlane] = queue;
  }

}
