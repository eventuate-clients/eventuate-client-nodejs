'use strict';
const expect = require('chai').expect;
const EventTypeSwimlaneDispatcher = require('../dist/modules/EventTypeSwimlaneDispatcher');
const Subscriber = require('../dist/modules/Subscriber');
const eventConfig = require('./lib/eventConfig');
const helpers = require('./lib/helpers');

const esClient = helpers.createEsClient();

const timeout = 30000;

const entityTypeName = eventConfig.entityTypeName;
const MyEntityWasCreatedEvent = eventConfig.MyEntityWasCreatedEvent;
const MyEntityWasUpdatedEvent = eventConfig.MyEntityWasUpdatedEvent;

const entityTypesAndEvents = {
 [entityTypeName]: [
    MyEntityWasCreatedEvent,
    MyEntityWasUpdatedEvent
  ]
};

const subscriptions = [
  {
    subscriberId: 'test-EventTypeSwimlaneDispatcher',
    entityTypesAndEvents: entityTypesAndEvents
  }
];

const eventHandlers = {
  [MyEntityWasCreatedEvent]: handleMyEntityWasCreatedEvent,
  [MyEntityWasUpdatedEvent]: handleMyEntityWasUpdatedEvent
};

let processed = 0;

describe('EventTypeSwimlaneDispatcher', function () {

  this.timeout(timeout);

  it('should receive events', done => {

    const events = [
      {
        eventType: MyEntityWasCreatedEvent,
        eventData: {
          action: 'created'
        }
      },
      {
        eventType: MyEntityWasUpdatedEvent,
        eventData: {
          action: 'updated'
        }
      },
      {
        eventType: MyEntityWasUpdatedEvent,
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

    setInterval(() => {
      if (processed == events.length) {
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
