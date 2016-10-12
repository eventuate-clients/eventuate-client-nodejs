'use strict';
const expect = require('chai').expect;
const helpers = require('./lib/helpers');
const EventStoreUtils = require('../dist').EventStoreUtils;
const EventDispatcher = require('../dist').EventDispatcher;
const Subscriber = require('../dist').Subscriber;

const eventConfig = require('./lib/eventConfig');
const entityTypeName = eventConfig.entityTypeName;
const MyEntityWasCreatedEvent = eventConfig.MyEntityWasCreatedEvent;
const MyEntityWasUpdatedEvent = eventConfig.MyEntityWasUpdatedEvent;

const entityTypesAndEvents = {
  [entityTypeName]: [
    MyEntityWasCreatedEvent,
    MyEntityWasUpdatedEvent
  ]
};


const EntityClass = require('./lib/EntityClass');
const CreateEntityCommand = EntityClass.CreateEntityCommand;
const UpdateEntityCommand = EntityClass.UpdateEntityCommand;

const esUtil = new EventStoreUtils();

const timeout = 20000;

let createTimestamp;
let updateTimestamp;


describe('EventStoreUtils: function createEntity()', function () {

  this.timeout(timeout);

  it('function createEntity() should return entityAndEventInfo object', done => {

    createTimestamp = new Date().getTime();
    const command = {
      commandType: CreateEntityCommand,
      createTimestamp
    };

    esUtil.createEntity(EntityClass, command, (err, createdEntityAndEventInfo) => {

      if (err) {
        return done(err);
      }

      helpers.expectCommandResult(createdEntityAndEventInfo, done);

      describe('EventStoreUtils.js: function updateEntity()', function () {
        this.timeout(timeout);

        it('function updateEntity() should update entity and return entityAndEventInfo object', done => {

          const entityId = createdEntityAndEventInfo.entityIdTypeAndVersion.entityId;

          updateTimestamp = new Date().getTime();
          const command = {
            commandType: UpdateEntityCommand,
            updateTimestamp
          };

          esUtil.updateEntity(EntityClass, entityId, command, (err, updatedEntityAndEventInfo) => {

            if (err) {
              return done(err);
            }

            helpers.expectCommandResult(updatedEntityAndEventInfo, done);

            describe('EventStoreUtils.js: function loadEvents()', function () {
              this.timeout(timeout);

              it('function loadEvents() should load events', done => {

                const entity = new EntityClass();

                esUtil.loadEvents(entity.entityTypeName, entityId, (err, loadedEvents) => {

                  if (err) {
                    return done(err);
                  }

                  helpers.expectLoadedEvents(loadedEvents);

                  expect(loadedEvents.length).to.equal(2);
                  expect(loadedEvents[0].eventData.timestamp).to.equal(createTimestamp);
                  expect(loadedEvents[1].eventData.timestamp).to.equal(updateTimestamp);

                  done();

                  describe('Test getApplyMethod() method', function () {

                    it('should return a function', () => {

                      loadedEvents.forEach(event => {

                        const type = event.eventType.split('.').pop();
                        const applyMethod = esUtil.getApplyMethod(entity, type);
                        expect(applyMethod).to.be.a('Function');
                      });

                      //check default applyEvent() method
                      const type = 'UnknownEventType';
                      const applyMethod = esUtil.getApplyMethod(entity, type);
                      expect(applyMethod).to.be.a('Function');
                    });

                  });


                  describe('Test getProcessCommandMethod() method', function () {

                    it('should return a function', () => {

                      let processCommandMethod = esUtil.getProcessCommandMethod(entity, CreateEntityCommand);
                      expect(processCommandMethod).to.be.a('Function');

                      processCommandMethod = esUtil.getProcessCommandMethod(entity, UpdateEntityCommand);
                      expect(processCommandMethod).to.be.a('Function');

                      //check default processCommand() method
                      processCommandMethod = esUtil.getProcessCommandMethod(entity, 'unknownCommand');
                      expect(processCommandMethod).to.be.a('Function');
                    });

                  });

                });

              });

            });

          });
        });
      });

      describe('EventDispatcher', function () {

        this.timeout(timeout);

        it('test process events', done => {

          let eventCount = 0;
          const expectedEventCount = 2;

          //Define event handlers
          const eventHandlers = {
            [MyEntityWasCreatedEvent]: handleMyEntityWasCreatedEvent,
            [MyEntityWasUpdatedEvent]: handleMyEntityWasUpdatedEvent
          };

          function handleMyEntityWasCreatedEvent(event) {

            helpers.expectEvent(event);

            if (event.eventData.timestamp == createTimestamp) {
              eventCount++;
            }

            return Promise.resolve();
          }

          function handleMyEntityWasUpdatedEvent(event) {

            helpers.expectEvent(event);

            if (event.eventData.timestamp == updateTimestamp) {
              eventCount++;
            }

            if(eventCount == expectedEventCount) {
              done();
            }

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
              subscriberId: 'test-EventStoreUtils',
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


    });
  });

});
