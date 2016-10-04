'use strict';
const expect = require('chai').expect;
const SwimlaneDispatcher = require('../src/modules/SwimlaneDispatcher');
const eventConfig = require('./lib/eventConfig');

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
    subscriberId: 'test-SwimlaneDispatcher',
    entityTypesAndEvents: entityTypesAndEvents
  }
];

const eventHandlers = {
  [MyEntityWasCreatedEvent]: handleMyEntityWasCreatedEvent,
  [MyEntityWasUpdatedEvent]: handleMyEntityWasUpdatedEvent
};

describe('SwimlaneDispatcher', function () {

  this.timeout(timeout);

  it('should subscribe', done => {

    const sd = new SwimlaneDispatcher({ subscriptions, getEventHandler });

    sd.startWorkflow((err, result) => {

      if (err) {
        return done(err);
      }

      console.log('result', result);
      done();
    })
  });

});


function handleMyEntityWasCreatedEvent(event) {

  console.log('handleMyEntityWasCreatedEvent');

  helpers.expectEvent(event);

  return Promise.resolve();
}

function handleMyEntityWasUpdatedEvent(event) {

  console.log('handleMyEntityWasUpdatedEvent');

  helpers.expectEvent(event);
  return Promise.resolve();
}

function getEventHandler (eventType) {
  if (typeof eventHandlers[eventType] != 'undefined') {
    return eventHandlers[eventType]
  }
}
