import 'babel-polyfill';
import Rx from 'rx';
import util from 'util';

import EventuateClient from './EventuateClient';
import { getLogger } from './logger';


export default class EventDispatcher {

  constructor({ eventHandlers, subscriptions = [] , logger = null, worker = {}} = {}) {

    if (!logger) {
      logger = getLogger({ title: 'EventDispatcher' });
    }

    Object.assign(this, { eventHandlers, subscriptions, logger, worker });

  }

  run(subscription) {

    subscription.observable
      .map(createObservable.call(this, this.eventHandlers))
      .merge(1)
      .subscribe(
        ({ ack, acknowledge }) => {
          if (ack) {
            this.logger.debug('acknowledge: ', ack);
            acknowledge(ack);
          }
        },
          err => this.logger.error('Event handler error:', err),
        () => this.logger.debug('Disconnected!')
      );
  }

};

function createObservable(eventHandlers) {
  return ({ event, acknowledge }) => Rx.Observable.create(observer => {

    const eventHandler = eventHandlers[event.entityTypeName][event.eventType];


    if (!eventHandler) {
      return observer.onError(new Error(`No event handler for eventType: ${event.eventType}`));
    }

    eventHandler(event)
      .then(result => {
        observer.onNext({ ack: event.ack, acknowledge });
        observer.onCompleted();
      })
      .catch(err => {
        observer.onError(err);
      });
  });

}
