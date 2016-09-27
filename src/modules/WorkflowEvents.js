import 'babel-polyfill';
import EsClient from './EsClient';
import Rx from 'rx';

let defaultLogger = {
  debug: (process.env.LOG_LEVEL == 'DEBUG')? console.log: function(){},
  info: console.log,
  error: console.error
};

export default class WorkflowEvents {

  constructor({ getEventHandler, subscriptions = [] , logger = null, worker = {}, apiKey = {} } = {}) {

    if (!logger) {
      logger = defaultLogger;
    }

    Object.assign(this, { getEventHandler, subscriptions, logger, worker });


    if (!apiKey.id) {
      apiKey.id = process.env.EVENTUATE_API_KEY_ID || process.env.EVENT_STORE_USER_ID;
    }

    if (!apiKey.secret) {
      apiKey.secret = process.env.EVENTUATE_API_KEY_SECRET || process.env.EVENT_STORE_PASSWORD;
    }

    if (!apiKey.id || !apiKey.secret) {
      throw new Error('Use `EVENTUATE_API_KEY_ID` and `EVENTUATE_API_KEY_SECRET` to set Event Store auth data');
    }

    let esClientOpts = {
      apiKey: apiKey,
      httpKeepAlive: true,
      spaceName: process.env.EVENTUATE_SPACE_NAME || process.env.EVENT_STORE_SPACE_NAME
    };

    this.esClient = new EsClient(esClientOpts);
  }

  startWorkflow() {


    this.subscriptions.forEach(({subscriberId, entityTypesAndEvents}) => {
      let logger = this.logger;
      const subscribe = this.esClient.subscribe(subscriberId, entityTypesAndEvents, (err, receiptId) => {
        if (err) {
          logger.error('subscribe callback error', err);
          return;
        }
        logger.info(`The subscription has been established
        receipt-id:${receiptId}
        `);
      });

      this.runProcessEvents(subscribe);
    });
  }

  runProcessEvents(subscription) {

    subscription.observable
      //.map(logEventTime)
      .map(createObservable.call(this, this.getEventHandler))
      .merge(1)
      .subscribe(
      (ack) => {
        if (ack) {
          this.logger.debug('acknowledge: ', ack);
          subscription.acknowledge(ack);
        }
      },
      (err) => this.logger.error('Subscribe Error', err),
      () => this.logger.debug('Disconnected!')
    );
  }

};

function logEventTime(event){
  let [eventTimePart] = event.eventId.split('-');
  let eventTime = new Date(parseInt(eventTimePart, 16));
  console.log('New Event (created at ' + eventTime + '): ', event);
  return event;
}

function createObservable(getEventHandler) {
  return (event) => Rx.Observable.create((observer) => {

    let eventHandler = getEventHandler.call(this.worker, event.eventType);

    if (eventHandler) {
      eventHandler(event).then(
        (result) => {
          observer.onNext(event.ack);
          observer.onCompleted();
        },
        (error) => {
          observer.onNext();
           observer.onCompleted();
        }
      );
    } else {
      this.logger.debug('No handler for eventType: ', event.eventType);
      observer.onNext();
      observer.onCompleted();
    }
  });

}
