import EventuateClient from './EventuateClient';
import { getLogger } from './logger';

export default class Subscriber {

  constructor({ subscriptions, eventuateClient, logger } = {}) {

    this.logger = logger || getLogger({ title: 'Subscriber' });
    this.subscriptions = subscriptions;

    if (!eventuateClient) {
      throw new Error('The option `eventuateClient` is not provided.')
    }

    this.eventuateClient = eventuateClient;
  }

  subscribe() {

    return this.subscriptions.map(({ subscriberId, entityTypesAndEvents }) => {

      return this.eventuateClient.subscribe(subscriberId, entityTypesAndEvents, (err, receiptId) => {

        if (err) {
          this.logger.error('Subscribe error:', err);
          return;
        }

        this.logger.info(`The subscription has been established receipt-id: ${receiptId}`);

      });

    });
  }
}