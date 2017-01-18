import Rx from 'rx';
import { getLogger } from './logger';

export default class ObservableQueue {

  constructor({ eventType, swimlane, eventHandler, executor }) {

    this.eventType = eventType;
    this.swimlane = swimlane;
    this.eventHandler = eventHandler;
    this.executor = executor;

    this.logger = getLogger({ title: `Queue-${this.eventType}-${this.swimlane}` });

    const observable = Rx.Observable.create(this.observableCreateFn.bind(this));

    observable
      .map(this.createObservableHandler())
      .merge(1)
      .subscribe(
        ({ ack, resolve }) => {
          resolve(ack);
        },
        ({ err, reject}) => {
          this.logger.error('Event handler error:', err);
          reject(err);
        },
        () => this.logger.debug('Disconnected!')
      );
  }

  observableCreateFn(observer) {
    this.observer = observer;
  }

  queueEvent({ event, resolve, reject }) {
    this.observer.onNext({ event, resolve, reject });
  }

  createObservableHandler() {

    return ({ event, resolve, reject }) => Rx.Observable.create(observer => {

      // this.logger.debug('processing event: ', event);
      if (!this.eventHandler) {
        return observer.onError(new Error(`No event handler for eventType: ${event.eventType}`));
      }

      try {
        this.eventHandler.call(this.executor, event)
          .then(
            result => {

              // this.logger.debug('processed event:', event);
              observer.onNext({ ack: event.ack, resolve });
              observer.onCompleted();
            })
          .catch(err => {
            observer.onError({ err, reject });
          });
      } catch (err) {
        observer.onError({ err, reject });
      }

    });

  }

}
