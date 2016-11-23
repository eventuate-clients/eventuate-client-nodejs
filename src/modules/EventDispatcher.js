import 'babel-polyfill';
import Rx from 'rx';
import util from 'util';

import EventuateClient from './EventuateClient';
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
        ack => {
        if (ack) {
          this.logger.debug('acknowledge: ', ack);
          subscription.acknowledge(ack);
        }
      },
        err => this.logger.error('Event handler error:', err),
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

    eventHandler(event)
      .then(result => {
        observer.onNext(event.ack);
        observer.onCompleted();
      })
      .catch(err => {
        observer.onError(err);
      });
  });

}
