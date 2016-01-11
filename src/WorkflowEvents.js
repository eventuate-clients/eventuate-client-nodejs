import 'babel-polyfill';
import Es from './es.js';
import Rx from 'rx';

let defaultLogger = {
  debug: (process.env.LOG_LEVEL == 'DEBUG')? console.log: function(){},
  info: console.log,
  error: console.error
};

const result = class WorkflowEvents {

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
      url: process.env.EVENTUATE_URL || process.env.EVENT_STORE_URL || "https://api.eventuate.io",
      stomp: {
        host: process.env.EVENTUATE_STOMP_SERVER_HOST || 'api.eventuate1.io',
        port: process.env.EVENTUATE_STOMP_SERVER_PORT || process.env.EVENT_STORE_STOMP_SERVER_PORT || 61614
      },
      apiKey: apiKey,
      httpKeepAlive: true,
      spaceName: process.env.EVENTUATE_SPACE_NAME || process.env.EVENT_STORE_SPACE_NAME
    };

    if (!esClientOpts.url || !esClientOpts.stomp.host || !esClientOpts.stomp.port) {
      throw new Error('Use `EVENTUATE_URL`, `EVENTUATE_STOMP_SERVER_HOST` and `EVENTUATE_STOMP_SERVER_PORT` to connect Event Store');
    }

    this.esClient = new Es.Client(esClientOpts);
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


export default result;
