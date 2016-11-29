'use strict';
const expect = require('chai').expect;
const ObservableQueue = require('../dist/modules/ObservableQueue');
const helpers = require('./lib/helpers');

const timeout = 10000;

const eventType = 'net.chrisrichardson.eventstore.example.MyEntityWasUpdatedEvent';
const swimlane = 2;
const events = helpers.makeEventsArr(10, eventType, swimlane);

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

    const queue = new ObservableQueue({ eventType, swimlane, eventHandler });

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

    const queue = new ObservableQueue({ eventType, swimlane, eventHandler });

    events.forEach((event) => {
      new Promise((resolve, reject) => {

        queue.queueEvent({ event, resolve, reject });
      });
    });


  });

});
