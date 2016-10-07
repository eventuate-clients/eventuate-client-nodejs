import 'babel-polyfill';
import util from 'util';

import ObservableQueue from './ObservableQueue';
import { getLogger } from './logger';

export default class EventTypeSwimlaneDispatcher {

  constructor({ logger = null, getEventHandler, subscription } = {}) {

    if (!logger) {
      logger = getLogger({ title: 'EventTypeSwimlaneDispatcher' });
    }

    this.getEventHandler =  getEventHandler;
    this.logger = logger;
    this.subscription = subscription;

    this.queues = {};

  }

  run() {

    this.subscription.observable.subscribe(
      event => {
        //this.logger.debug(event);
        this.dispatch(event);
      },
      err => {
        this.logger.error(err);
      },
      () => {
        this.logger.debug('Completed')
      }
    )
  }

  dispatch(event) {

    const { eventType, swimlane } = event;

    this.logger.debug(`eventType: ${eventType}, swimlane: ${swimlane}`);

    let queue = this.getQueue({ eventType, swimlane });

    if (!queue) {
      this.logger.debug(`Create new queue for eventType: ${eventType}, swimlane: ${swimlane}`);

      const eventHandler = this.getEventHandler(eventType);
      queue = new ObservableQueue({ eventType, swimlane, eventHandler, acknowledgeFn: this.subscription.acknowledge });

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
