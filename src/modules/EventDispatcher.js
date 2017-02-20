import 'babel-polyfill';

import { getLogger } from './logger';


export default class EventDispatcher {

  constructor({ eventHandlers, logger = null, executor = {} } = {}) {

    if (!logger) {
      logger = getLogger({ title: 'EventDispatcher' });
    }

    Object.assign(this, { eventHandlers, logger, executor });

  }

  dispatch(event) {

    const { entityType, eventType } = event;

    const eventHandler = this.eventHandlers[entityType][eventType];

    if (!eventHandler) {
      return Promise.reject(new Error(`No event handler for eventType: ${eventType}`));
    }

    return eventHandler.call(this.executor, event)
      .then(() => event.ack)
      .catch((err) => {
        return Promise.reject(err);
      });
  }

};
