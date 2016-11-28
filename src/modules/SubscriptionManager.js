import Rx from 'rx';
import { getLogger } from './logger';

export default class SubscriptionManager {

  constructor({ eventuateClient, dispatcher, logger } = {}) {

    this.logger = logger || getLogger({ title: 'SubscriptionManager' });
    this.dispatcher = dispatcher;

    if (!eventuateClient) {
      throw new Error('The option `eventuateClient` is not provided.')
    }

    this.eventuateClient = eventuateClient;
  }

  eventHandlersToEntityTypesAndEvents(eventHandlers) {

    return Object.keys(eventHandlers)
      .reduce((entityTypesAndEvents, entityTypeName) => {

        entityTypesAndEvents[entityTypeName] = Object.keys(eventHandlers[entityTypeName]);

        return entityTypesAndEvents;
      }, {});

  }

  subscribe({ subscriberId, eventHandlers }) {

    const entityTypesAndEvents = this.eventHandlersToEntityTypesAndEvents(eventHandlers);
    this.logger.debug('entityTypesAndEvents:', entityTypesAndEvents);

    const eventHandler = (event) => {

      this.logger.debug('event:', event);
      return this.dispatcher.dispatch(event)
        .then(() => event.ack)
        .catch((err) => {
          return Promise.reject(err);
        });
    };

    this.eventuateClient.subscribe(subscriberId, entityTypesAndEvents, eventHandler, (err, receiptId) => {

      if (err) {
        throw new Error(err);
      }

      this.logger.info(`The subscription has been established: ${receiptId}`);

    });
  }
}