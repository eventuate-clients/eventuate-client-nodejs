import Rx from 'rx';
import { getLogger } from './logger';

export default class ObservableQueue {

  constructor({ entityType, swimlane, eventHandlers, executor }) {

    this.entityType = entityType;
    this.swimlane = swimlane;
    this.eventHandlers = eventHandlers;
    this.executor = executor;

    this.logger = getLogger({ title: `EventuateClient:Queue-${this.entityType}-${this.swimlane}` });

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

      const { entityType, eventType } = event;

      const eventHandler = this.eventHandlers[entityType][eventType];

      if (!eventHandler) {
        return reject(new Error(`No event handler for entityType/eventType: ${entityType}/${eventType}`));
      }

      try {
        eventHandler.call(this.executor, event)
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
