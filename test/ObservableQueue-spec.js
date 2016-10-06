'use strict';
const expect = require('chai').expect;
const ObservableQueue = require('../src/modules/ObservableQueue');
const helpers = require('./lib/helpers');

const timeout = 10000;

const eventType = 'net.chrisrichardson.eventstore.example.MyEntityWasUpdatedEvent';
const swimlane = 2;
const events = helpers.makeEventsArr(10, eventType, swimlane);


const acknowledgeFn = ack => {

};

describe('ObservableQueue', function () {

  this.timeout(timeout);

  xit('should process all events', done => {

    let processedEvents = 0;

    const eventHandler = event => {
      console.log('Processing event:', event);

      processedEvents++;

      if (processedEvents == events.length) {
        done();
      }

      return Promise.resolve();
    };

    const queue = new ObservableQueue({ eventType, swimlane, eventHandler, acknowledgeFn });

    events.forEach(queue.queueEvent.bind(queue));

  });

  it('should stop processing if handler error', done => {

    let processedEvents = 0;
    const stop = 3;

    const eventHandler = event => {
      console.log('Processing event:', event);

      if (stop === processedEvents) {
        return Promise.reject(new Error('Some error'));
      }

      processedEvents++;

      return Promise.resolve();
    };

    const queue = new ObservableQueue({ eventType, swimlane, eventHandler, acknowledgeFn });

    events.forEach(queue.queueEvent.bind(queue));
  });

});
