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
    MyEntityCreateEvent
  ]
};


const EntityClass = require('./lib/EntityClass');
const CreateEntityCommand = EntityClass.CreateEntityCommand;
const CreatedEntityCommand = EntityClass.CreatedEntityCommand;

const eventuateClient = helpers.createEventuateClient();
const aggregateRepository = new AggregateRepository({ eventuateClient });

const timeout = 20000;

let entityId;
let triggeringEventToken;

describe('AggregateRepository with triggeringEventToken', function () {

  this.timeout(timeout);

  it(`should create ${MyEntityCreateEvent} event`, done => {

    const createTimestamp = new Date().getTime();
    const command = {
      commandType: CreateEntityCommand,
      createTimestamp
    };

    console.log('command', command);

    aggregateRepository.createEntity({ EntityClass, command })
      .then(createdEntityAndEventInfo => {
        helpers.expectCommandResult(createdEntityAndEventInfo);
        done();
      })
      .catch(err => {
        console.log('error', err);
        done(err);
      });
  });


  it('should subscribe for events and update', done => {

    //Define event handlers
    const eventHandlers = {
      [MyEntityCreateEvent]: handleMyEntityCreateEvent
    };

    function handleMyEntityCreateEvent(event) {

      helpers.expectEvent(event);

      entityId = event.entityId;
      triggeringEventToken = event.eventToken;
      const createdTimestamp = new Date().getTime();

      const command = {
        commandType: CreatedEntityCommand,
        createdTimestamp
      };

      const options = { triggeringEventToken };

      return aggregateRepository.updateEntity({ EntityClass, entityId, command, options })
        .then(result => {
          console.log('result:', result);
          helpers.expectCommandResult(result);

          done();
        })
        .catch(done);
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

    const subscriber = new Subscriber({ eventuateClient, subscriptions });

    subscriber.subscribe().forEach(subscription => {
      //Create EventDispatcher instance
      const dispatcher = new EventDispatcher({ getEventHandler, subscription });
      dispatcher.run(subscription);

    });
  });

  it('should update with old triggeredEventToken', done => {
    expect(triggeringEventToken).to.be.ok;
    expect(entityId).to.be.ok;

    const createdTimestamp = new Date().getTime();

    const command = {
      commandType: CreatedEntityCommand,
      createdTimestamp
    };

    const options = { triggeringEventToken };

    aggregateRepository.updateEntity({ EntityClass, entityId, command, options })
      .then(result => {
        helpers.expectCommandResult(result);

        done();
      })
      .catch(done);
  });
});
