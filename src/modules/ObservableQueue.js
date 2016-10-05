import EventEmitter from 'events';
import Rx from 'rx';

import { getLogger } from './logger';

export default class ObservableQueue {

  constructor({ eventType, swimlane, eventHandler, acknowledgeFn }) {

    Object.assign(this, { eventType, swimlane, eventHandler, acknowledgeFn });

    this.logger = getLogger({ title: `Queue-${this.eventType}-${this.swimlane}` });

    this.eventEmitter = new EventEmitter();

    const observable = Rx.Observable.create(this.observableCreateFn.bind(this));

    observable
      .map(this.createObservableHandler())
      .merge(1)
      .subscribe(
        ack => {
          if (ack) {
            this.logger.debug('acknowledge: ', ack);
            this.acknowledgeFn(ack);
          }
        },
        err => {
          this.logger.error('Subscribe Error', err);
          this.eventEmitter.removeListener('event', this.onEventListener);
        },
        () => this.logger.debug('Disconnected!')
      );
  }

  observableCreateFn(observer) {
    this.observer = observer;
    this.eventEmitter.on('event', this.onEventListener.bind(this));
  }

  onEventListener(event) {
    this.observer.onNext(event);
  }

  queueEvent(event) {
    this.eventEmitter.emit('event', event);
  }

  createObservableHandler() {

    return event => Rx.Observable.create(observer => {

      if (!this.eventHandler) {
        return observer.onError(new Error(`No event handler for eventType: ${event.eventType}`));
      }

      this.eventHandler(event).then(
        result => {
          observer.onNext(event.ack);
          observer.onCompleted();
        },
        err => {
          this.logger.error('eventHandler error:', err);
          observer.onError(err);
        });
    });

  }

}

function createObservable(eventHandler) {
  return event => Rx.Observable.create(observer => {

    if (!eventHandler) {
      return observer.onError(new Error(`No event handler for eventType: ${event.eventType}`));
    }

    eventHandler(event).then(
      result => {
        observer.onNext(event.ack);
        observer.onCompleted();
      },
      err => {
        console.error('eventHandler error:', err);
        observer.onError(err);
      }
    );
  });

}
