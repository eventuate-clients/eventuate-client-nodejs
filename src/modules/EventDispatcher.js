import 'babel-polyfill';
import Rx from 'rx';
import util from 'util';

import EsClient from './EsClient';
import { getLogger } from './logger';


export default class EventDispatcher {

  constructor({ getEventHandler, subscriptions = [] , logger = null, worker = {}} = {}) {

    if (!logger) {
      logger = getLogger({ title: 'EventDispatcher' });
    }

    Object.assign(this, { getEventHandler, subscriptions, logger, worker });

  }

  run(subscription) {

    subscription.observable
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

function createObservable(getEventHandler) {
  return event => Rx.Observable.create(observer => {

    const eventHandler = getEventHandler.call(this.worker, event.eventType);


    if (!eventHandler) {
      return observer.onError(new Error(`No event handler for eventType: ${event.eventType}`));
    }

    eventHandler(event).then(
      result => {
        observer.onNext(event.ack);
        observer.onCompleted();
      },
      observer.onError
    );
  });

}
