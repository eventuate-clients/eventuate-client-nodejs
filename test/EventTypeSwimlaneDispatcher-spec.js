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

const subscriptionManager = new EventuateSubscriptionManager({ eventuateClient, eventHandlers });

console.log('eventHandlers:', eventHandlers);

let processed = 0;
const timestamp = new Date().getTime();
let eventIds;

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
        eventIds = createdEntityAndEventInfo.eventIds;

        subscriptionManager.subscribe({ subscriberId, eventHandlers, executor, swimlane: true });

        const interval = setInterval(() => {
          if (processed == events.length) {
            clearInterval(interval);
            done();
          }
        }, 1000);
      })
      .catch(done);
  });
});

function handleMyEntityWasCreatedEvent(event) {
  console.log('Running handleMyEntityWasCreatedEvent');
  expect(this.getClassName()).to.equal(ExecutorClass.name);

  return new Promise((resolve) => {
    resolve(event.ack);

    helpers.expectEvent(event);
    expect(event.eventType).to.equal(myEntityWasCreatedEvent);
    expect(event.eventData).to.have.property('timestamp');
    expect(event.eventData.timestamp).to.equal(timestamp);

    if (eventIds.indexOf(event.eventId) >= 0) {
      processed++;
    } else {
      console.log('Old event');
    }
  });
}

function handleMyEntityWasUpdatedEvent(event) {
  console.log('Running handleMyEntityWasUpdatedEvent');
  expect(this.getClassName()).to.equal(ExecutorClass.name);

  return new Promise((resolve) => {
    resolve(event.ack);

    helpers.expectEvent(event);
    expect(event.eventType).to.equal(myEntityWasUpdatedEvent);
    expect(event.eventData).to.have.property('timestamp');
    expect(event.eventData.timestamp).to.equal(timestamp);

    if (eventIds.indexOf(event.eventId) >= 0) {
      processed++;
    } else {
      console.log('Old event');
    }
  });
}
