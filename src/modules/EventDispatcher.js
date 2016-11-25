import 'babel-polyfill';
import Rx from 'rx';
import util from 'util';

import { getLogger } from './logger';


export default class EventDispatcher {

  constructor({ eventHandlers, logger = null, worker = {}} = {}) {

    if (!logger) {
      logger = getLogger({ title: 'EventDispatcher' });
    }

    Object.assign(this, { eventHandlers, logger, worker });

  }

  run({ observable, acknowledge }) {

    observable
      .map(createObservable.call(this, this.eventHandlers))
      .merge(1)
      .subscribe(
        (ack) => {
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
  return (event) => Rx.Observable.create(observer => {

    const eventHandler = eventHandlers[event.entityType][event.eventType];

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
