import 'babel-polyfill';
import Rx from 'rx';
import util from 'util';

import { getLogger } from './logger';


export default class EventDispatcher {

  constructor({ eventHandlers, logger = null, worker = {} } = {}) {

    if (!logger) {
      logger = getLogger({ title: 'EventDispatcher' });
    }

    Object.assign(this, { eventHandlers, logger, worker });

  }

  dispatch(event) {

    const { entityType, eventType } = event;

    console.log('entityType, eventType ', entityType, eventType);

    const eventHandler = this.eventHandlers[entityType][eventType];

    if (!eventHandler) {
      return Promise.reject(new Error(`No event handler for eventType: ${eventType}`));
    }

    return eventHandler(event);
  }

};
