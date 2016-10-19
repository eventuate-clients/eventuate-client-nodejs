'use strict';
const expect = require('chai').expect;
const helpers = require('./lib/helpers');
const AggregateRepository = require('../dist').AggregateRepository;
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
const CreatedEntityCommand = EntityClass.CreatedEntityCommand;
const UpdateEntityCommand = EntityClass.UpdateEntityCommand;

const aggregateRepository = new AggregateRepository();

const timeout = 20000;

let createdTimestamp;
let updateTimestamp;


describe('AggregateRepository: function createEntity()', function () {

  this.timeout(timeout);

  it('function createEntity() should return entityAndEventInfo object', done => {

    createdTimestamp = new Date().getTime();
    const command = {
      commandType: CreatedEntityCommand,
      createdTimestamp
    };

    aggregateRepository.createEntity(EntityClass, command, (err, createdEntityAndEventInfo) => {

      if (err) {
        return done(err);
      }

      helpers.expectCommandResult(createdEntityAndEventInfo, done);

      describe('AggregateRepository.js: function updateEntity()', function () {
        this.timeout(timeout);

        it('function updateEntity() should update entity and return entityAndEventInfo object', done => {

          const entityId = createdEntityAndEventInfo.entityIdTypeAndVersion.entityId;

          updateTimestamp = new Date().getTime();
          const command = {
            commandType: UpdateEntityCommand,
            updateTimestamp
          };

          aggregateRepository.updateEntity(EntityClass, entityId, command, (err, updatedEntityAndEventInfo) => {

            if (err) {
              return done(err);
            }

            helpers.expectCommandResult(updatedEntityAndEventInfo, done);

            describe('AggregateRepository.js: function loadEvents()', function () {
              this.timeout(timeout);

              it('should load events', done => {

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

            console.log('event:', event);
            //helpers.expectEvent(event);

            if (event.eventData.timestamp == createdTimestamp) {
              eventCount++;
            }

            return Promise.resolve();
          }

          function handleMyEntityWasUpdatedEvent(event) {

            console.log('event:', event);
            //helpers.expectEvent(event);

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
              subscriberId: 'test-AggregateRepository',
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
