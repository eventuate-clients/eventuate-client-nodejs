'use strict';
const expect = require('chai').expect;
const helpers = require('./lib/helpers');
const AggregateRepository = require('../dist').AggregateRepository;
const EventuateSubscriptionManager = require('../dist').EventuateSubscriptionManager;
const ExecutorClass = helpers.Executor;
const HandlersManager = helpers.HandlersManager;
const executor = new ExecutorClass();

const eventConfig = require('./lib/eventConfig');
const entityTypeName = eventConfig.entityTypeName;
const anotherEntityTypeName = eventConfig.anotherEntityTypeName;
const MyEntityWasCreatedEvent = eventConfig.MyEntityWasCreatedEvent;
const MyEntityWasUpdatedEvent = eventConfig.MyEntityWasUpdatedEvent;

const EntityClass = require('./lib/EntityClass');
const CreatedEntityCommand = EntityClass.CreatedEntityCommand;
const UpdateEntityCommand = EntityClass.UpdateEntityCommand;

const eventuateClient = helpers.createEventuateClient();
const aggregateRepository = new AggregateRepository({ eventuateClient, EntityClass });
const subscriptionManager = new EventuateSubscriptionManager({ eventuateClient });

const timeout = 20000;

let createdTimestamp;
let updateTimestamp;

let entityId;
let myEntityWasCreatedEventId;
let myEntityWasUpdatedEventId;

describe('AggregateRepository', function () {

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
        myEntityWasCreatedEventId = createdEntityAndEventInfo.eventIds[0];
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

        helpers.expectCommandResult(updatedEntityAndEventInfo);

        myEntityWasUpdatedEventId = updatedEntityAndEventInfo.eventIds[0];

        done();
      })
      .catch(done);
  });

  it('function updateEntity() should try to update not existing entity and return error with code 404', done => {

    const command = {
      commandType: UpdateEntityCommand,
      updateTimestamp
    };

    aggregateRepository.updateEntity({ EntityClass, entityId: '0000000000000001', command })
      .then(() => {
        done(new Error('Should return error!'));
      })
      .catch((err) => {
        expect(err).to.be.an('Object');
        expect(err).to.haveOwnProperty('code');
        expect(err.code).to.equal(404);
        expect(err).to.haveOwnProperty('message');
        expect(err.message).to.be.a('String');
        done();
      });
  });

  it('Method find() should return updated Aggregate instance', done => {
    aggregateRepository.find(entityId)
      .then(entity => {
        expect(entity).to.be.instanceOf(EntityClass);
        expect(entity.timestamp).to.equal(updateTimestamp);
        done();
      })
      .catch(done)
  });

  it('Method find() should return "false" for not existing entityId', done => {
    const entityId = new Date().getTime().toString();
    aggregateRepository.find(entityId)
      .then(entity => {
        expect(entity).to.be.equal(false);
        done();
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

describe('EventuateSubscriptionManager', function () {

  this.timeout(timeout);

  it('should subscribe two subscribers and receive events', done => {

    const handlersManager = new HandlersManager({ done });

    const handleMyEntityWasCreatedEvent = helpers.createEventHandler((event) => {
      console.log('handleMyEntityWasCreatedEvent()');
      expect(event.eventType).to.equal(MyEntityWasCreatedEvent);

      if (myEntityWasCreatedEventId == event.eventId) {
        handlersManager.setCompleted('handleMyEntityWasCreatedEvent');
      }
    });

    const handleMyEntityWasUpdatedEvent = helpers.createEventHandler((event) => {
      console.log('handleMyEntityWasUpdatedEvent()');
      expect(event.eventType).to.equal(MyEntityWasUpdatedEvent);

      if (myEntityWasUpdatedEventId == event.eventId) {
        handlersManager.setCompleted('handleMyEntityWasUpdatedEvent');
      } else {
        console.log('Old event');
      }
    });

    handlersManager.setHandlers([ 'handleMyEntityWasCreatedEvent', 'handleMyEntityWasUpdatedEvent' ]);

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

    let processedEventsNumber1 = 0;
    let processedEventsNumber2 = 0;
    const expectedEventsNumber = 10;
    let myEntityWasCreatedEventIds = [];

    const handlersManager = new HandlersManager({ done });

    const handleMyEntityWasCreatedEvent1 = helpers.createEventHandler((event) => {

      expect(event.eventType).to.equal(MyEntityWasCreatedEvent);

      if (myEntityWasCreatedEventIds.indexOf(event.eventId) >= 0) {

        processedEventsNumber1++;

        if (processedEventsNumber1 == expectedEventsNumber) {
          console.log(`handleMyEntityWasCreatedEvent1() processed ${processedEventsNumber1} events`);
          handlersManager.setCompleted('handleMyEntityWasCreatedEvent1');
        }
      } else {
        console.log('Old event')
      }

    });

    const handleMyEntityWasCreatedEvent2 = helpers.createEventHandler((event) => {

      expect(event.eventType).to.equal(MyEntityWasCreatedEvent);

      if (myEntityWasCreatedEventIds.indexOf(event.eventId) >= 0) {

        processedEventsNumber2++;

        if (processedEventsNumber2 == expectedEventsNumber) {
          console.log(`handleMyEntityWasCreatedEvent2() processed ${processedEventsNumber2} events`);
          handlersManager.setCompleted('handleMyEntityWasCreatedEvent2');
        }
      } else {
        console.log('Old event')
      }
    });

    handlersManager.setHandlers([ 'handleMyEntityWasCreatedEvent1', 'handleMyEntityWasCreatedEvent2' ]);

    const entityCreatedEventHandlers1 = {
      [anotherEntityTypeName]: {
        [MyEntityWasCreatedEvent]: handleMyEntityWasCreatedEvent1
      }
    };

    subscriptionManager.subscribe({
      subscriberId: 'test-SubscriptionManager-subscriber1',
      eventHandlers: entityCreatedEventHandlers1,
      executor
    });

    const entityCreatedEventHandlers2 = {
      [anotherEntityTypeName]: {
        [MyEntityWasCreatedEvent]: handleMyEntityWasCreatedEvent2
      }
    };

    subscriptionManager.subscribe({
      subscriberId: 'test-SubscriptionManager-subscriber2',
      eventHandlers: entityCreatedEventHandlers2,
      executor
    });

    const events = helpers.makeEventsArr({ size: expectedEventsNumber, entityType: anotherEntityTypeName, eventType: MyEntityWasCreatedEvent });

    setTimeout(() => {
      eventuateClient.create(anotherEntityTypeName, events)
        .then(createdEntityAndEventInfo => {

          console.log('Entity created');
          console.log(createdEntityAndEventInfo);

          myEntityWasCreatedEventIds = myEntityWasCreatedEventIds.concat(createdEntityAndEventInfo.eventIds);
          console.log('myEntityWasCreatedEventIds:', myEntityWasCreatedEventIds);
          helpers.expectCommandResult(createdEntityAndEventInfo);
        })
        .catch(done);

    }, 2000);
  });
});
