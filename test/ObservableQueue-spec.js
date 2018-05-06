'use strict';
const ObservableQueue = require('../dist/modules/ObservableQueue');
const helpers = require('./lib/helpers');

const timeout = 10000;

const entityType = 'net.chrisrichardson.eventstore.example.MyTestEntity';
const eventType = 'net.chrisrichardson.eventstore.example.MyEntityWasUpdatedEvent';
const swimlane = 2;
const events = helpers.makeEventsArr({ size: 10, entityType, eventType, swimlane });

describe('ObservableQueue', function () {

  this.timeout(timeout);

  it('should process all events', done => {

    let processedEvents = 0;

    const eventHandler = event => {
      return new Promise((resolve, reject) => {

        processedEvents++;

        if (processedEvents == events.length) {
          done();
        }

        resolve()
      });
    };

    const eventHandlers = {
      [entityType]: {
        [eventType]: eventHandler
      }
    };

    const queue = new ObservableQueue({ entityType, swimlane, eventHandlers });

    events.forEach((event) => {
      new Promise((resolve, reject) => {
        queue.queueEvent({ event, resolve, reject });
      });
    });
  });

  it('should stop processing if handler error', done => {

    let processedEvents = 0;
    const stop = 3;

    const eventHandler = event => {
      return new Promise((resolve, reject) => {

        processedEvents++;

        if (stop === processedEvents) {
          reject(new Error('Some error'));
          return done();
        }

        if (processedEvents == events.length) {
          done(new Error('The queue did not stop'))
        }

        resolve();
      });
    };

    const eventHandlers = {
      [entityType]: {
        [eventType]: eventHandler
      }
    };

    const queue = new ObservableQueue({ entityType, swimlane, eventHandlers });

    events.forEach((event) => {
      new Promise((resolve, reject) => {
        queue.queueEvent({ event, resolve, reject });
      });
    });
  });
});
