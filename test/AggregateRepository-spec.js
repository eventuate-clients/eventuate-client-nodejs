'use strict';
const expect = require('chai').expect;
const helpers = require('./lib/helpers');
const AggregateRepository = require('../dist').AggregateRepository;
const EventDispatcher = require('../src').EventDispatcher;
const SubscriptionManager = require('../src').SubscriptionManager;

const eventConfig = require('./lib/eventConfig');
const entityTypeName = eventConfig.entityTypeName;
const MyEntityWasCreatedEvent = eventConfig.MyEntityWasCreatedEvent;
const MyEntityWasUpdatedEvent = eventConfig.MyEntityWasUpdatedEvent;


const EntityClass = require('./lib/EntityClass');
const CreatedEntityCommand = EntityClass.CreatedEntityCommand;
const UpdateEntityCommand = EntityClass.UpdateEntityCommand;

const eventuateClient = helpers.createEventuateClient();
const aggregateRepository = new AggregateRepository({ eventuateClient });

const timeout = 20000;

let createdTimestamp;
let updateTimestamp;

let entityId;


describe('AggregateRepository: function createEntity()', function () {

  this.timeout(timeout);

  it('function createEntity() should return entityAndEventInfo object', done => {

    createdTimestamp = new Date().getTime();
    const command = {
      commandType: CreatedEntityCommand,
      createdTimestamp
    };

    aggregateRepository.createEntity({ EntityClass, command })
      .then(createdEntityAndEventInfo => {

        helpers.expectCommandResult(createdEntityAndEventInfo);
        entityId = createdEntityAndEventInfo.entityIdTypeAndVersion.entityId;

        done();
    })
    .catch(done);
  });

  it('function updateEntity() should update entity and return entityAndEventInfo object', done => {

    expect(entityId).to.be.ok;

    updateTimestamp = new Date().getTime();
    const command = {
      commandType: UpdateEntityCommand,
      updateTimestamp
    };

    aggregateRepository.updateEntity({ EntityClass, entityId, command })
      .then(updatedEntityAndEventInfo => {
      console.log('updateEntity result:' , updatedEntityAndEventInfo);
      helpers.expectCommandResult(updatedEntityAndEventInfo, done);
      })
      .catch(done);
  });

  it('function loadEvents() should load events', done => {

    expect(entityId).to.be.ok;

    const entity = new EntityClass();

    aggregateRepository.loadEvents({ entityTypeName, entityId })
      .then(loadedEvents => {

        helpers.expectLoadedEvents(loadedEvents);

        expect(loadedEvents.length).to.equal(2);
        expect(loadedEvents[0].eventData.timestamp).to.equal(createdTimestamp);
        expect(loadedEvents[1].eventData.timestamp).to.equal(updateTimestamp);

        done();

        describe('Test getApplyMethod() method', function () {

          it('should return a function', () => {

            loadedEvents.forEach(event => {

              const type = event.eventType.split('.').pop();
              const applyMethod = aggregateRepository.getApplyMethod(entity, type);
              expect(applyMethod).to.be.a('Function');
            });

            //check default applyEvent() method
            const type = 'UnknownEventType';
            const applyMethod = aggregateRepository.getApplyMethod(entity, type);
            expect(applyMethod).to.be.a('Function');
          });

        });

        describe('Test getProcessCommandMethod() method', function () {

          it('should return a function', () => {

            let processCommandMethod = aggregateRepository.getProcessCommandMethod(entity, CreatedEntityCommand);
            expect(processCommandMethod).to.be.a('Function');

            processCommandMethod = aggregateRepository.getProcessCommandMethod(entity, UpdateEntityCommand);
            expect(processCommandMethod).to.be.a('Function');

            //check default processCommand() method
            processCommandMethod = aggregateRepository.getProcessCommandMethod(entity, 'unknownCommand');
            expect(processCommandMethod).to.be.a('Function');
          });

        });

      })
      .catch(done);

  });

});

describe('EventDispatcher', function () {

  this.timeout(timeout);

  it('test process events', done => {

    let eventCount = 0;
    const expectedEventCount = 2;

    //Define event handlers
    function handleMyEntityWasCreatedEvent(event) {
      console.log('handleMyEntityWasCreatedEvent()');

      helpers.expectEvent(event);

      if (event.eventData.timestamp == createdTimestamp) {
        eventCount++;
      }

      return Promise.resolve();
    }

    function handleMyEntityWasUpdatedEvent(event) {

      console.log('handleMyEntityWasUpdatedEvent()');

      helpers.expectEvent(event);

      if (event.eventData.timestamp == updateTimestamp) {
        eventCount++;
      }

      if(eventCount == expectedEventCount) {
        done();
      }

      return Promise.resolve();
    }

    const eventHandlers = {
      [entityTypeName]: {
        [MyEntityWasCreatedEvent]: handleMyEntityWasCreatedEvent,
        [MyEntityWasUpdatedEvent]: handleMyEntityWasUpdatedEvent
      }
    };

    console.log('eventHandlers:', eventHandlers);
    const subscriberId = 'test-AggregateRepository';

    const eventuateClient = helpers.createEventuateClient();
    const dispatcher = new EventDispatcher({ eventHandlers });

    const subscriber = new SubscriptionManager({ eventuateClient, dispatcher, eventHandlers });

    subscriber.subscribe({ subscriberId, eventHandlers });
  });

});
