import EventDispatcher from './EventDispatcher';
import EventTypeSwimlaneDispatcher from './EventTypeSwimlaneDispatcher';
import { getLogger } from './logger';

export default class EventuateSubscriptionManager {

  constructor({ eventuateClient, logger } = {}) {

    this.logger = logger || getLogger({ title: 'EventuateSubscriptionManager' });

    if (!eventuateClient) {
      throw new Error('The option `eventuateClient` is not provided.')
    }

    this.eventuateClient = eventuateClient;

    this.dispatchers = new Map();
  }

  eventHandlersToEntityTypesAndEvents(eventHandlers) {

    return Object.keys(eventHandlers)
      .reduce((entityTypesAndEvents, entityTypeName) => {

        entityTypesAndEvents[entityTypeName] = Object.keys(eventHandlers[entityTypeName]);

        return entityTypesAndEvents;
      }, {});

  }

  subscribe({ subscriberId, eventHandlers, executor, swimlane = false }) {

    const entityTypesAndEvents = this.eventHandlersToEntityTypesAndEvents(eventHandlers);

    let dispatcher;

    if (swimlane) {
      dispatcher = new EventTypeSwimlaneDispatcher({ eventHandlers, executor })
    } else {
      dispatcher = new EventDispatcher({ eventHandlers, executor });
    }


    this.dispatchers.set(subscriberId, dispatcher);

    this.logger.debug(`Subscribe "${subscriberId}" for:`, entityTypesAndEvents);

    const eventHandler = (event) => {
      this.logger.debug(`Event for subscriber "${subscriberId}":`, event);

      const dispatcher = this.dispatchers.get(subscriberId);
      return dispatcher.dispatch(event);
    };



    this.eventuateClient.subscribe(subscriberId, entityTypesAndEvents, eventHandler, (err, receiptId) => {

      if (err) {
        throw new Error(err);
      }

      this.logger.info(`${subscriberId} subscribed: ${receiptId}`);

    });
  }
}