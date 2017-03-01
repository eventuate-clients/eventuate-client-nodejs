'use strict';
const expect = require('chai').expect;
const EventuateSubscriptionManager = require('../dist').EventuateSubscriptionManager;
const helpers = require('./lib/helpers');
const ExecutorClass = helpers.Executor;
const executor = new ExecutorClass();
const eventuateClient = helpers.createEventuateClient();

const timeout = 30000;

const entityTypeName = `net.chrisrichardson.eventstore.example.MyEntity-${helpers.getUniqueID()}`;
const myEntityWasCreatedEvent = 'net.chrisrichardson.eventstore.example.MyEntityWasCreatedEvent';
const myEntityWasUpdatedEvent = 'net.chrisrichardson.eventstore.example.MyEntityWasUpdatedEvent';

const subscriberId = 'EventTypeSwimlaneDispatcher-test';

const eventHandlers = {
  [entityTypeName]: {
    [myEntityWasCreatedEvent]: handleMyEntityWasCreatedEvent,
    [myEntityWasUpdatedEvent]: handleMyEntityWasUpdatedEvent
  }
};

console.log('eventHandlers:', eventHandlers);

let processed = 0;
const timestamp = new Date().getTime();

describe('EventTypeSwimlaneDispatcher', function () {

  this.timeout(timeout);

  it('should receive events', done => {

    const events = [
      {
        eventType: myEntityWasCreatedEvent,
        eventData: {
          action: 'created',
          timestamp
        }
      },
      {
        eventType: myEntityWasUpdatedEvent,
        eventData: {
          action: 'updated',
          timestamp
        }
      },
      {
        eventType: myEntityWasUpdatedEvent,
        eventData: {
          action: 'updated',
          timestamp
        }
      },
      {
        eventType: myEntityWasUpdatedEvent,
        eventData: {
          action: 'updated',
          timestamp
        }
      },
      {
        eventType: myEntityWasUpdatedEvent,
        eventData: {
          action: 'updated',
          timestamp
        }
      }
    ];

    eventuateClient.create(entityTypeName, events)
      .then(createdEntityAndEventInfo => {
        helpers.expectCommandResult(createdEntityAndEventInfo);

        const subscriptionManager = new EventuateSubscriptionManager({ eventuateClient, eventHandlers });
        subscriptionManager.subscribe({ subscriberId, eventHandlers, executor, swimlane: true });


        const interval = setInterval(() => {
          if (processed == events.length) {
            clearInterval(interval);
            done();
          }

        }, 1000)

      })
      .catch(done);
  });
});

function handleMyEntityWasCreatedEvent(event) {
  console.log('Running handleMyEntityWasCreatedEvent');

  expect(this.getClassName()).to.equal(ExecutorClass.name);
  helpers.expectEvent(event);
  expect(event.eventType).to.equal(myEntityWasCreatedEvent);
  expect(event.eventData).to.have.property('timestamp');
  expect(event.eventData.timestamp).to.equal(timestamp);

  processed++;
  return Promise.resolve();
}

function handleMyEntityWasUpdatedEvent(event) {
  console.log('Running handleMyEntityWasUpdatedEvent');

  expect(this.getClassName()).to.equal(ExecutorClass.name);
  helpers.expectEvent(event);
  expect(event.eventType).to.equal(myEntityWasUpdatedEvent);
  expect(event.eventData).to.have.property('timestamp');
  expect(event.eventData.timestamp).to.equal(timestamp);

  processed++;
  //return Promise.reject(new Error('Event handler handleMyEntityWasUpdatedEvent error!'));
  return Promise.resolve();
}

