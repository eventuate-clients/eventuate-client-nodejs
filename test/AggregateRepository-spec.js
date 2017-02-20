'use strict';
const expect = require('chai').expect;
const helpers = require('./lib/helpers');
const AggregateRepository = require('../dist').AggregateRepository;
const SubscriptionManager = require('../dist').SubscriptionManager;
const ExecutorClass = helpers.Executor;
const executor = new ExecutorClass();

const eventConfig = require('./lib/eventConfig');
const entityTypeName = eventConfig.entityTypeName;
const MyEntityWasCreatedEvent = eventConfig.MyEntityWasCreatedEvent;
const MyEntityWasUpdatedEvent = eventConfig.MyEntityWasUpdatedEvent;


const EntityClass = require('./lib/EntityClass');
const CreatedEntityCommand = EntityClass.CreatedEntityCommand;
const UpdateEntityCommand = EntityClass.UpdateEntityCommand;

const eventuateClient = helpers.createEventuateClient();
const aggregateRepository = new AggregateRepository({ eventuateClient });
const subscriptionManager = new SubscriptionManager({ eventuateClient });

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

describe('SubscriptionManager', function () {

  this.timeout(timeout);

  it('should subscribe two subscribers and receive events', done => {

    function handleMyEntityWasCreatedEvent(event) {
      console.log('handleMyEntityWasCreatedEvent()');

      return new Promise((resolve, reject) => {
        helpers.expectEvent(event);
        expect(event.eventType).to.equal(MyEntityWasCreatedEvent);

        setTimeout(() => {
          resolve(event);
        }, 1000);
      });
    }

    function handleMyEntityWasUpdatedEvent(event) {

      console.log('handleMyEntityWasUpdatedEvent()');

      return new Promise((resolve, reject) => {

        helpers.expectEvent(event);
        expect(event.eventType).to.equal(MyEntityWasUpdatedEvent);

        setTimeout(() => {
          resolve(event);
          done();
        }, 1000);

      });
    }

    const entityCreatedEventHandlers = {
      [entityTypeName]: {
        [MyEntityWasCreatedEvent]: handleMyEntityWasCreatedEvent
      }
    };

    const entityUpdatedEventHandlers = {
      [entityTypeName]: {
        [MyEntityWasUpdatedEvent]: handleMyEntityWasUpdatedEvent
      }
    };

    subscriptionManager.subscribe({
      subscriberId: 'test-AggregateRepository-subscriber1',
      eventHandlers: entityCreatedEventHandlers,
      executor
    });

    subscriptionManager.subscribe({
      subscriberId: 'test-AggregateRepository-subscriber2',
      eventHandlers: entityUpdatedEventHandlers,
      executor
    });
  });

  it('should create entity with 10 events and subscribe', done => {

    //create events
    let processedEventsNumber = 0;
    const expectedEventsNumber = 10;
    const events = helpers.makeEventsArr(expectedEventsNumber, MyEntityWasCreatedEvent);

    eventuateClient.create(entityTypeName, events)
      .then(createdEntityAndEventInfo => {

        console.log('Entity created');

        helpers.expectCommandResult(createdEntityAndEventInfo);
      })
      .catch(done);

    function handleMyEntityWasCreatedEvent1(event) {
      console.log('handleMyEntityWasCreatedEvent()');

      helpers.expectEvent(event);
      expect(event.eventType).to.equal(MyEntityWasCreatedEvent);

      processedEventsNumber++;

      if (processedEventsNumber == expectedEventsNumber) {
        console.log(`processed ${processedEventsNumber} events`);
        done();
      }

      return Promise.resolve();
    }

    function handleMyEntityWasCreatedEvent2(event) {
      console.log('handleMyEntityWasCreatedEvent()');

      helpers.expectEvent(event);
      expect(event.eventType).to.equal(MyEntityWasCreatedEvent);

      processedEventsNumber++;

      if (processedEventsNumber == expectedEventsNumber) {
        console.log(`processed ${processedEventsNumber} events`);
        done();
      }

      return Promise.resolve();
    }

    const entityCreatedEventHandlers1 = {
      [entityTypeName]: {
        [MyEntityWasCreatedEvent]: handleMyEntityWasCreatedEvent1
      }
    };

    const entityCreatedEventHandlers2 = {
      [entityTypeName]: {
        [MyEntityWasCreatedEvent]: handleMyEntityWasCreatedEvent2
      }
    };

    subscriptionManager.subscribe({
      subscriberId: 'test-AggregateRepository-subscriber1',
      eventHandlers: entityCreatedEventHandlers1,
      executor
    });

    subscriptionManager.subscribe({
      subscriberId: 'test-AggregateRepository-subscriber2',
      eventHandlers: entityCreatedEventHandlers2,
      executor
    });

  });

});
