import Rx from 'rx';

import { getLogger } from './logger';

export default class ObservableQueue {

  constructor({ eventType, swimlane, eventHandler, executor, acknowledgeFn }) {

    this.eventType = eventType;
    this.swimlane = swimlane;
    this.eventHandler = eventHandler;
    this.executor = executor;
    this.acknowledgeFn = acknowledgeFn;

    this.logger = getLogger({ title: `Queue-${this.eventType}-${this.swimlane}` });

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
        },
        () => this.logger.debug('Disconnected!')
      );
  }

  observableCreateFn(observer) {
    this.observer = observer;
  }

  queueEvent(event) {
    this.observer.onNext(event);
  }

  createObservableHandler() {

    return event => Rx.Observable.create(observer => {

      if (!this.eventHandler) {
        return observer.onError(new Error(`No event handler for eventType: ${event.eventType}`));
      }

      this.eventHandler.call(this.executor, event).then(
        result => {
          observer.onNext(event.ack);
          observer.onCompleted();
        }
      )
      .catch(err => {
          observer.onError(err);
      });
    });

  }

}
