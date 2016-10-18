import EsClient from './EsClient';
import { getLogger } from './logger';

export default class Subscriber {

  constructor({ subscriptions, apiKey = {}, logger } = {}) {

    this.logger = logger || getLogger({ title: 'Subscriber' });
    this.subscriptions = subscriptions;
    this.apiKey = apiKey;

    this.esClient = this.createEsClientInstance()
  }

  createEsClientInstance() {
    if (!this.apiKey.id) {
      this.apiKey.id = process.env.EVENTUATE_API_KEY_ID || process.env.EVENT_STORE_USER_ID;
    }

    if (!this.apiKey.secret) {
      this.apiKey.secret = process.env.EVENTUATE_API_KEY_SECRET || process.env.EVENT_STORE_PASSWORD;
    }

    if (!this.apiKey.id || !this.apiKey.secret) {
      throw new Error('Use `EVENTUATE_API_KEY_ID` and `EVENTUATE_API_KEY_SECRET` to set Event Store auth data');
    }

    let esClientOpts = {
      apiKey: this.apiKey,
      httpKeepAlive: true,
      spaceName: process.env.EVENTUATE_SPACE_NAME || process.env.EVENT_STORE_SPACE_NAME,
      debug: false

    };

    return new EsClient(esClientOpts);
  }

  subscribe() {

    return this.subscriptions.map(({ subscriberId, entityTypesAndEvents }) => {

      return this.esClient.subscribe(subscriberId, entityTypesAndEvents, (err, receiptId) => {

        if (err) {
          return callback(err);
        }

        this.logger.info(`The subscription has been established receipt-id: ${receiptId}`);

      });

    });
  }
}