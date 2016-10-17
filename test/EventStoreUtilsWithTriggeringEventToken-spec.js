'use strict';
const parallel = require('mocha.parallel');
const expect = require('chai').expect;
const helpers = require('./lib/helpers');
const EventStoreUtils = require('../dist').EventStoreUtils;
const EventDispatcher = require('../dist').EventDispatcher;
const Subscriber = require('../dist').Subscriber;

const eventConfig = require('./lib/eventConfig');
const entityTypeName = eventConfig.entityTypeName;
const MyEntityCreateEvent = eventConfig.MyEntityCreateEvent;
const MyEntityWasCreatedEvent = eventConfig.MyEntityWasCreatedEvent;

const entityTypesAndEvents = {
  [entityTypeName]: [
    MyEntityCreateEvent,
    MyEntityWasCreatedEvent
  ]
};


const EntityClass = require('./lib/EntityClass');
const CreateEntityCommand = EntityClass.CreateEntityCommand;
const CreatedEntityCommand = EntityClass.CreatedEntityCommand;

const esUtil = new EventStoreUtils();

const timeout = 20000;

describe('EventStoreUtils with triggeringEventToken', function () {

  this.timeout(timeout);

  it(`should create ${MyEntityCreateEvent} event`, done => {

    const createTimestamp = new Date().getTime();
    const command = {
      commandType: CreateEntityCommand,
      createTimestamp
    };

    esUtil.createEntity(EntityClass, command, (err, result) => {

      if (err) {
        return done(err);
      }

      helpers.expectCommandResult(result, done);
    });
  });


  it('should subscribe for events', done => {

    //Define event handlers
    const eventHandlers = {
      [MyEntityCreateEvent]: handleMyEntityCreateEvent,
      [MyEntityWasCreatedEvent]: handleMyEntityWasCreatedEvent
    };

    function handleMyEntityCreateEvent(event) {

      helpers.expectEvent(event);

      const entityId = event.entityId;
      const triggeredEventToken = event.eventToken;
      const createdTimestamp = new Date().getTime();

      const command = {
        commandType: CreatedEntityCommand,
        createdTimestamp
      };

      return new Promise((resolve, reject) => {

        esUtil.updateEntity(EntityClass, entityId, command, triggeredEventToken, (err, result) => {

          if (err) {
            return reject(err);
          }

          helpers.expectCommandResult(result);

        });
      });
    }

    function handleMyEntityWasCreatedEvent(event) {

      helpers.expectEvent(event);

      done();

      return Promise.resolve();
    }


    function getEventHandler (eventType) {
      if (typeof eventHandlers[eventType] != 'undefined') {
        return eventHandlers[eventType]
      }
    }

    //Define subscriptions
    const subscriptions = [
      {
        subscriberId: 'test-EventStoreUtilsWithTriggeringEventToken',
        entityTypesAndEvents
      }
    ];

    const subscriber = new Subscriber({ subscriptions });

    subscriber.subscribe().forEach(subscription => {
      //Create EventDispatcher instance
      const dispatcher = new EventDispatcher({ getEventHandler, subscription });
      dispatcher.run(subscription);

    });
  });
});
