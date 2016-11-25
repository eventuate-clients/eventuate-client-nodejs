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

    /*return this.subscriptions.map(({ subscriberId, entityTypesAndEvents }) => {

      return this.eventuateClient.subscribe(subscriberId, entityTypesAndEvents, (err, receiptId) => {

        if (err) {
          this.logger.error('Subscribe error:', err);
          return;
        }

        this.logger.info(`The subscription has been established receipt-id: ${receiptId}`);

      });

    });*/

    const entityTypesAndEvents = this.eventHandlersToEntityTypesAndEvents(eventHandlers);
    this.logger.debug('entityTypesAndEvents:', entityTypesAndEvents);

    let acknowledge;

    const createFn = (observer) => {

      const eventHandler = (err, event) => {

        if (err) {
          return observer.onError(err);
        }

        observer.onNext(event);

      };

      acknowledge = this.eventuateClient.subscribe(subscriberId, entityTypesAndEvents, eventHandler, (err, receiptId) => {

        if (err) {
          throw new Error(err);
        }

        this.logger.info(`The subscription has been established: ${receiptId}`);

      });

    };


    const observable = Rx.Observable.create(createFn);

    this.dispatcher.run({ observable, acknowledge });
  }
}