'use strict';
const expect = require('chai').expect;
const EventTypeSwimlaneDispatcher = require('../dist').EventTypeSwimlaneDispatcher;
const Subscriber = require('../dist').Subscriber;
const helpers = require('./lib/helpers');

const esClient = helpers.createEsClient();

const timeout = 30000;

const entityTypeName = `net.chrisrichardson.eventstore.example.MyEntity-${helpers.getUniqueID()}`;
const myEntityWasCreatedEvent = 'net.chrisrichardson.eventstore.example.MyEntityWasCreatedEvent';
const myEntityWasUpdatedEvent = 'net.chrisrichardson.eventstore.example.MyEntityWasCreatedEvent';

const entityTypesAndEvents = {
 [entityTypeName]: [
    myEntityWasCreatedEvent,
    myEntityWasUpdatedEvent
  ]
};

console.log(entityTypesAndEvents);

const subscriptions = [
  {
    subscriberId: 'EventTypeSwimlaneDispatcher-test',
    entityTypesAndEvents: entityTypesAndEvents
  }
];

const eventHandlers = {
  [myEntityWasCreatedEvent]: handleMyEntityWasCreatedEvent,
  [myEntityWasUpdatedEvent]: handleMyEntityWasUpdatedEvent
};

let processed = 0;

describe('EventTypeSwimlaneDispatcher', function () {

  this.timeout(timeout);

  it('should receive events', done => {

    const events = [
      {
        eventType: myEntityWasCreatedEvent,
        eventData: {
          action: 'created'
        }
      },
      {
        eventType: myEntityWasUpdatedEvent,
        eventData: {
          action: 'updated'
        }
      },
      {
        eventType: myEntityWasUpdatedEvent,
        eventData: {
          action: 'updated'
        }
      }
    ];

    esClient.create(entityTypeName, events, function (err, createdEntityAndEventInfo) {

      if (err) {
        return done(err);
      }

      helpers.expectCommandResult(createdEntityAndEventInfo);

    });

    const subscriber = new Subscriber({ subscriptions });

    subscriber.subscribe().forEach(subscription => {

      const dispatcher = new EventTypeSwimlaneDispatcher({ getEventHandler, subscription, executor: new Executor() });
      dispatcher.run();

    });

    const interval = setInterval(() => {
      if (processed == events.length) {
        clearInterval(interval);
        done();
      }

    }, 1000)
  });
});


class Executor {
  getClassName() {
    return Executor.name;
  }
}

function handleMyEntityWasCreatedEvent(event) {
  console.log('Running handleMyEntityWasCreatedEvent');

  expect(this.getClassName()).to.equal(Executor.name);
  helpers.expectEvent(event);

  processed++;
  return Promise.resolve();
}

function handleMyEntityWasUpdatedEvent(event) {
  console.log('Running handleMyEntityWasUpdatedEvent');

  expect(this.getClassName()).to.equal(Executor.name);
  helpers.expectEvent(event);
  processed++;
  //return Promise.reject(new Error('Event handler handleMyEntityWasUpdatedEvent error!'));
  return Promise.resolve();
}

function getEventHandler (eventType) {
  if (typeof eventHandlers[eventType] != 'undefined') {
    return eventHandlers[eventType]
  }
}
