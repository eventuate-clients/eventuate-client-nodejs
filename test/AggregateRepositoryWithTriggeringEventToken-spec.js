'use strict';
const parallel = require('mocha.parallel');
const expect = require('chai').expect;
const helpers = require('./lib/helpers');
const AggregateRepository = require('../dist').AggregateRepository;
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

const aggregateRepository = new AggregateRepository();

const timeout = 200000;

parallel('AggregateRepository with triggeringEventToken', function () {

  this.timeout(timeout);

/*  it(`should create ${MyEntityCreateEvent} event`, done => {

    const createTimestamp = new Date().getTime();
    const command = {
      commandType: CreateEntityCommand,
      createTimestamp
    };

    aggregateRepository.createEntity(EntityClass, command, (err, result) => {

      if (err) {
        return done(err);
      }

      helpers.expectCommandResult(result, done);
    });
  });*/


  it('should subscribe for events', done => {

    //Define event handlers
    const eventHandlers = {
      [MyEntityCreateEvent]: handleMyEntityCreateEvent,
      [MyEntityWasCreatedEvent]: handleMyEntityWasCreatedEvent
    };

    function handleMyEntityCreateEvent(event) {

      console.log('event:', event);

      helpers.expectEvent(event);

      const entityId = event.entityId;
      const triggeringEventToken = event.eventToken;
      //const triggeringEventToken = 'eyJzdWJzY3JpYmVySWQiOiJkNmJmYTQ3YzI4M2Y0ZmNmYjIzYzQ5YjJkZjhjMTBlZF9kZWZhdWx0X3Rlc3QtRXZlbnRTdG9yZVV0aWxzV2l0aFRyaWdnZXJpbmdFdmVudFRva2VuIiwiZXZlbnRJZEFuZFR5cGUiOnsiaWQiOiIwMDAwMDE1N2Q4Nzk2MDZmLTAyNDJhYzExMDBmYjAwMDIiLCJldmVudFR5cGUiOiJuZXQuY2hyaXNyaWNoYXJkc29uLmV2ZW50c3RvcmUuZXhhbXBsZS5NeUVudGl0eUNyZWF0ZUV2ZW50In0sInNlbmRlciI6eyJlbnRpdHlJZCI6IjAwMDAwMTU3ZDg3OTYwNmUtMDI0MmFjMTEwMGZjMDAwMCIsImVudGl0eVR5cGUiOiJkNmJmYTQ3YzI4M2Y0ZmNmYjIzYzQ5YjJkZjhjMTBlZC9kZWZhdWx0L25ldC5jaHJpc3JpY2hhcmRzb24uZXZlbnRzdG9yZS5leGFtcGxlLk15RW50aXR5In0sInByb3ZpZGVySGFuZGxlIjoiMDAwMDAxNTdkODc5NjEzOS0wMjQyYWMxMTAwZmEwMDAwOmQ2YmZhNDdjMjgzZjRmY2ZiMjNjNDliMmRmOGMxMGVkX1NMQVNIX2RlZmF1bHRfU0xBU0hfbmV0LmNocmlzcmljaGFyZHNvbi5ldmVudHN0b3JlLmV4YW1wbGUuTXlFbnRpdHk6NjoxNDE5OCIsImV2ZW50SWQiOiIwMDAwMDE1N2Q4Nzk2MDZmLTAyNDJhYzExMDBmYjAwMDIiLCJldmVudFR5cGUiOiJuZXQuY2hyaXNyaWNoYXJkc29uLmV2ZW50c3RvcmUuZXhhbXBsZS5NeUVudGl0eUNyZWF0ZUV2ZW50In0';
      const createdTimestamp = new Date().getTime();

      const command = {
        commandType: CreatedEntityCommand,
        createdTimestamp
      };

      return new Promise((resolve, reject) => {

        aggregateRepository.updateEntity(EntityClass, entityId, command, { triggeringEventToken }, (err, result) => {

          if (err) {

            console.error('err:', err);
            return reject(err);
          }

          console.log('result:', result);

          //helpers.expectCommandResult(result);
          resolve();
        });
      });
    }

    function handleMyEntityWasCreatedEvent(event) {

      console.log('event:', event);

      helpers.expectEvent(event);

      //done();

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
