'use strict';
const expect = require('chai').expect;
const SwimlaneDispatcher = require('../src/modules/EventTypeSwimlaneDispatcher');
const eventConfig = require('./lib/eventConfig');
const helpers = require('./lib/helpers');

var esClient = helpers.createEsClient();

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

describe('EventTypeSwimlaneDispatcher', function () {

  this.timeout(timeout);

  xit('should subscribe', done => {

    const sd = new SwimlaneDispatcher({ subscriptions, getEventHandler });

    sd.startWorkflow((err, result) => {

      if (err) {
        return done(err);
      }

      console.log('result', result);
      done();
    });
  });

  it('should receive events', done => {

    const sd = new SwimlaneDispatcher({ subscriptions, getEventHandler });

    sd.startWorkflow((err, result) => {
      if (err) {
        return done(err);
      }

    });

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
  });
});


function handleMyEntityWasCreatedEvent(event) {
  console.log('Running handleMyEntityWasCreatedEvent');

  helpers.expectEvent(event);

  return Promise.resolve();
}

function handleMyEntityWasUpdatedEvent(event) {
  console.log('Running handleMyEntityWasUpdatedEvent');

  helpers.expectEvent(event);
  //return Promise.reject(new Error('Event handler handleMyEntityWasUpdatedEvent error!'));
  return Promise.resolve();
}

function getEventHandler (eventType) {
  if (typeof eventHandlers[eventType] != 'undefined') {
    return eventHandlers[eventType]
  }
}
